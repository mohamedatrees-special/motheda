import crypto from 'crypto';
import { AdminRole, AdminUser, OTPChallenge } from '../../types/index.ts';
import { db } from '../db/store.ts';

export interface AdminSession {
  sessionId: string;
  username: string;
  fullName: string;
  role: AdminRole;
  createdAt: number;
  expiresAt: number;
}

export class AuthService {
  private static OTP_TTL_MS = 3 * 60 * 1000; // 3 minutes

  /**
   * Phase 1: Verify username and password, apply throttling, issue OTP challenge
   */
  public static initiateAdminLogin(
    username: string,
    passwordAttempt: string
  ): { success: boolean; challengeId?: string; messageAr: string; devOtp?: string } {
    const isProd = process.env.NODE_ENV === 'production';
    const user = db.adminUsers.get(username);

    if (!user || !user.isActive) {
      return { success: false, messageAr: 'بيانات الدخول غير صحيحة أو تم إيقاف الحساب.' };
    }

    const verification = db.verifyAdminPassword(username, passwordAttempt);
    if (verification.locked) {
      return {
        success: false,
        messageAr: `تم إغلاق الحساب مؤقتاً لتكرار المحاولات الخاطئة. يرجى المحاولة بعد ${verification.remainingMinutes} دقيقة.`,
      };
    }

    if (!verification.success) {
      db.addAuditLog({
        id: `audit-fail-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: username,
        role: 'UNAUTHENTICATED',
        action: 'FAILED_LOGIN_ATTEMPT',
        entity: 'ADMIN_AUTH',
        entityId: username,
        details: 'محاولة تسجيل دخول فاشلة بكلمة مرور غير صحيحة.',
      });
      return { success: false, messageAr: 'بيانات الدخول غير صحيحة.' };
    }

    // Generate cryptographically secure 6-digit OTP
    const rawOtp = String(Math.floor(100000 + crypto.randomInt(900000)));
    const challengeId = `chal-${Date.now()}-${crypto.randomBytes(12).toString('hex')}`;
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    const challenge: OTPChallenge = {
      challengeId,
      username,
      otpHash,
      expiresAt: Date.now() + this.OTP_TTL_MS,
      attempts: 0,
      maxAttempts: 3,
      channel: 'WHATSAPP',
    };

    db.otpChallenges.set(challengeId, challenge);

    // Development Console notification only (Phase 2.3: NEVER log OTP in production)
    if (!isProd) {
      console.log(`\n==================================================`);
      console.log(`[🔐 MOTAHEDA ADMIN 2FA OTP] Challenge: ${challengeId}`);
      console.log(`[📱 WHATSAPP DISPATCH] Admin: ${user.fullName} (${user.phone})`);
      console.log(`[⚡ OTP CODE]: >>> ${rawOtp} <<< (Expires in 3 mins)`);
      console.log(`==================================================\n`);
    }

    return {
      success: true,
      challengeId,
      messageAr: `تم إرسال رمز التحقق (OTP) المكون من 6 أرقام إلى واتساب المشرف المسجل (${user.phone}).`,
      // Phase 2.2: Never return devOtp to browser in production!
      devOtp: isProd ? undefined : rawOtp,
    };
  }

  /**
   * Phase 2: Verify 6-digit OTP challenge and issue rotated persistent session
   */
  public static verifyAdminOtp(
    challengeId: string,
    otpAttempt: string
  ): { success: boolean; session?: AdminSession; messageAr: string } {
    const challenge = db.otpChallenges.get(challengeId);
    if (!challenge) {
      return { success: false, messageAr: 'جلسة التحقق غير موجودة أو منتهية الصلاحية.' };
    }

    if (Date.now() > challenge.expiresAt) {
      db.otpChallenges.delete(challengeId);
      return { success: false, messageAr: 'انتهت صلاحية رمز التحقق (3 دقائق). يرجى طلب رمز جديد.' };
    }

    challenge.attempts++;
    if (challenge.attempts > challenge.maxAttempts) {
      db.otpChallenges.delete(challengeId);
      return { success: false, messageAr: 'تم تجاوز الحد الأقصى للمحاولات الخاطئة. تم إلغاء الطلب لحماية الحساب.' };
    }

    // Update attempts in DB
    db.otpChallenges.set(challengeId, challenge);

    const computedHash = crypto.createHash('sha256').update(otpAttempt.trim()).digest('hex');
    if (computedHash !== challenge.otpHash) {
      return {
        success: false,
        messageAr: `رمز التحقق غير صحيح. متبقي لديك ${challenge.maxAttempts - challenge.attempts} محاولة.`,
      };
    }

    // OTP verified successfully! Delete challenge immediately to prevent replay (Phase 2.4)
    db.otpChallenges.delete(challengeId);

    const user = db.adminUsers.get(challenge.username)!;
    const session = this.createRotatedSession(user);

    db.addAuditLog({
      id: `audit-login-ok-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: user.username,
      role: user.role,
      action: 'ADMIN_LOGIN_SUCCESS',
      entity: 'ADMIN_AUTH',
      entityId: user.id,
      details: 'تسجيل دخول ناجح للوحة التحكم عبر المصادقة الثنائية OTP.',
    });

    return {
      success: true,
      session,
      messageAr: 'تم التحقق بنجاح. مرحباً بك في لوحة تحكم المتجر.',
    };
  }

  /**
   * Emergency Fallback: Single-use, expiring recovery codes stored as secure hashes (Phase 2.4)
   */
  public static verifyEmergencyRecoveryCode(
    username: string,
    recoveryCodeAttempt: string
  ): { success: boolean; session?: AdminSession; messageAr: string } {
    const user = db.adminUsers.get(username);
    if (!user || !user.isActive) {
      return { success: false, messageAr: 'المستخدم غير موجود أو غير نشط.' };
    }

    const isValid = db.verifySingleUseRecoveryCode(username, recoveryCodeAttempt);
    if (!isValid) {
      db.addAuditLog({
        id: `audit-rec-fail-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        timestamp: new Date().toISOString(),
        actor: username,
        role: 'EMERGENCY_ACCESS',
        action: 'FAILED_RECOVERY_CODE',
        entity: 'ADMIN_AUTH',
        entityId: user.id,
        details: 'محاولة فاشلة للدخول برمز استرداد طوارئ غير صحيح أو تم استخدامه مسبقاً.',
      });
      return { success: false, messageAr: 'رمز استرداد الطوارئ غير صحيح أو تم استخدامه مسبقاً.' };
    }

    const session = this.createRotatedSession(user);

    db.addAuditLog({
      id: `audit-rec-ok-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString(),
      actor: user.username,
      role: user.role,
      action: 'EMERGENCY_RECOVERY_LOGIN',
      entity: 'ADMIN_AUTH',
      entityId: user.id,
      details: 'تم الدخول الاضطراري للوحة الإدارة برمز استرداد طوارئ أحادي الاستخدام (تم استهلاكه وإبطاله).',
    });

    return {
      success: true,
      session,
      messageAr: 'تم التحقق بنجاح عبر رمز الطوارئ الاحتياطي أحادي الاستخدام.',
    };
  }

  private static createRotatedSession(user: AdminUser): AdminSession {
    // Generate high-entropy 32-byte session token
    const sessionId = `sess-${Date.now()}-${crypto.randomBytes(32).toString('hex')}`;
    const session: AdminSession = {
      sessionId,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours persistent TTL
    };

    db.saveSession(session);
    return session;
  }

  public static getSession(sessionId: string): AdminSession | null {
    return db.getSession(sessionId);
  }

  public static invalidateSession(sessionId: string): void {
    db.deleteSession(sessionId);
  }
}
