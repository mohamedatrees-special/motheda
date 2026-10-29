import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  Building,
  CheckCircle,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Edit,
  Eye,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  MapPin,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Truck,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AdminRole, AuditLog, DeliveryZone, Order, OrderStatus, Product } from '../types/index.ts';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Authentication State
  const [session, setSession] = useState<{ username: string; fullName: string; role: AdminRole } | null>(null);
  const [authStep, setAuthStep] = useState<'LOGIN' | 'OTP' | 'EMERGENCY'>('LOGIN');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard & Tabs State
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ORDERS' | 'PRODUCTS' | 'SHIPPING' | 'AUDIT'>('OVERVIEW');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [shippingZones, setShippingZones] = useState<DeliveryZone[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  function showFeedback(type: 'success' | 'error', message: string) {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 4000);
  }

  // New Product Modal State
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newTitleAr, setNewTitleAr] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newBrand, setNewBrand] = useState('السويدي للكابلات');
  const [newPrice, setNewPrice] = useState('250');
  const [newStock, setNewStock] = useState('20');
  const [newVoltage, setNewVoltage] = useState('220V');
  const [newCategory, setNewCategory] = useState('cat-cables');

  // Check existing session on load
  useEffect(() => {
    fetch('/api/admin/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setSession(d.user);
          loadDashboard();
        }
      })
      .catch(() => {});
  }, []);

  function loadDashboard() {
    setLoadingData(true);
    Promise.all([
      fetch('/api/admin/dashboard').then((r) => r.json()),
      fetch('/api/admin/orders').then((r) => r.json()),
      fetch('/api/admin/products').then((r) => r.json()),
      fetch('/api/admin/shipping/zones').then((r) => r.json()),
      fetch('/api/admin/audit-logs').then((r) => r.json()),
    ])
      .then(([dash, ords, prods, zones, audits]) => {
        setDashboardData(dash);
        if (ords.orders) setOrders(ords.orders);
        if (prods.products) setProducts(prods.products);
        if (zones.zones) setShippingZones(zones.zones);
        if (audits.auditLogs) setAuditLogs(audits.auditLogs);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingData(false));
  }

  // Phase 1 Login: Username & Password
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setChallengeId(data.challengeId);
      if (data.devOtp) setDevOtp(data.devOtp);
      setAuthStep('OTP');
    } catch (err: any) {
      setAuthError(err.message || 'فشل تسجيل الدخول.');
    } finally {
      setAuthLoading(false);
    }
  }

  // Phase 2 Login: WhatsApp OTP Challenge
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const res = await fetch('/api/admin/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSession(data.session);
      loadDashboard();
    } catch (err: any) {
      setAuthError(err.message || 'فشل التحقق من رمز OTP.');
    } finally {
      setAuthLoading(false);
    }
  }

  // Emergency Recovery Code Fallback (Section 15.3 Resilience Rule)
  async function handleEmergencyLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const res = await fetch('/api/admin/auth/emergency-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, recoveryCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSession(data.session);
      loadDashboard();
    } catch (err: any) {
      setAuthError(err.message || 'رمز الطوارئ غير صحيح.');
    } finally {
      setAuthLoading(false);
    }
  }

  // Logout
  async function handleLogout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    setSession(null);
    setAuthStep('LOGIN');
  }

  // Status transition
  async function handleTransitionOrder(orderId: string, status: OrderStatus) {
    const reason = prompt('أدخل سبب تعديل حالة الطلب لسجلات التدقيق (Audit Log):', 'تحديث إداري معتمد');
    if (!reason) return;

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      loadDashboard();
      showFeedback('success', 'تم تحديث حالة الطلب بنجاح وتوثيق العملية في سجل التدقيق.');
    } catch (err: any) {
      showFeedback('error', `خطأ: ${err.message}`);
    }
  }

  // Add Product
  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleAr: newTitleAr,
          sku: newSku,
          brand: newBrand,
          basePrice: Number(newPrice),
          stockQuantity: Number(newStock),
          lowStockThreshold: 5,
          voltage: newVoltage,
          categoryId: newCategory,
          descriptionAr: 'صنف كهربائي معتمد للمقاولات والتأسيس',
          isActive: true,
          images: [
            'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setIsAddingProduct(false);
      setNewTitleAr('');
      setNewSku('');
      loadDashboard();
      showFeedback('success', 'تمت إضافة المنتج الجديد بنجاح إلى قاعدة البيانات.');
    } catch (err: any) {
      showFeedback('error', `خطأ: ${err.message}`);
    }
  }

  // Toggle Delivery Zone Mode
  async function handleUpdateZone(zoneId: string, defaultFee: number, mode: 'FLAT' | 'DISTRICT') {
    try {
      const res = await fetch(`/api/admin/shipping/zones/${zoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultFee, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      loadDashboard();
      showFeedback('success', 'تم تحديث منطقة الشحن ورسوم التوصيل بنجاح.');
    } catch (err: any) {
      showFeedback('error', `خطأ: ${err.message}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md flex flex-col">
      {/* Top Admin Navbar */}
      <div className="bg-slate-900 border-b border-slate-800 text-white px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-white">
                بوابة الإدارة المركزية — شركة المتحدة للأدوات الكهربائية
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
                Admin v2026.1
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              إدارة المخزون، الطلبات، مصفوفة الشحن، بوابة بايموب، وسجلات التدقيق
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              <div className="text-left hidden sm:block text-xs">
                <span className="font-bold text-slate-200 block">{session.fullName}</span>
                <span className="text-[10px] text-amber-400 font-mono font-semibold">
                  دور الصلاحية: {session.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthStep(authStep === 'EMERGENCY' ? 'LOGIN' : 'EMERGENCY')}
              className="text-xs text-amber-400 hover:underline font-bold"
            >
              {authStep === 'EMERGENCY' ? 'الرجوع للمصادقة العادية' : 'رمز استرداد الطوارئ'}
            </button>
          )}

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px]"
            title="العودة لمتجر المتحدة للعملاء"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">العودة للمتجر</span>
          </button>
        </div>
      </div>

      {/* Global Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between text-white ${
            actionFeedback.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          <span>{actionFeedback.message}</span>
          <button onClick={() => setActionFeedback(null)} className="text-white hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 bg-slate-900/60 overflow-y-auto p-4 sm:p-6">
        {!session ? (
          /* ================================================= */
          /* AUTHENTICATION SCREENS (STAGE 1, 2, or EMERGENCY) */
          /* ================================================= */
          <div className="max-w-md mx-auto my-12 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            {authStep === 'LOGIN' && (
              <form onSubmit={handleLogin} className="p-8 space-y-5">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                    <Shield className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    تسجيل دخول المشرفين (المرحلة 1)
                  </h3>
                  <p className="text-xs text-slate-500">
                    يلزم تأكيد كلمة المرور متبوعة برمز التحقق (2FA OTP)
                  </p>
                </div>

                {authError && (
                  <div className="bg-red-50 text-red-800 text-xs p-3 rounded-xl border border-red-300 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اسم المستخدم:
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      كلمة المرور المشفرة (Argon2 / PBKDF2):
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl text-[11px] text-slate-500 space-y-1 border border-slate-200">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    <span>منطقة آمنة ومحمية بسجلات تدقيق مشددة</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    أدخل بيانات حساب الإدارة المعتمدة. سيتم إرسال رمز تحقق مؤقت (2FA OTP) تلقائياً إلى واتساب المشرف المعتمد.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{authLoading ? 'جاري التحقق...' : 'متابعة إلى رمز التحقق (OTP)'}</span>
                </button>
              </form>
            )}

            {authStep === 'OTP' && (
              <form onSubmit={handleVerifyOtp} className="p-8 space-y-5">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    المصادقة الثنائية (المرحلة 2)
                  </h3>
                  <p className="text-xs text-slate-500">
                    أدخل رمز التحقق (6 أرقام) المرسل لواتساب المشرف (صلاحية 3 دقائق)
                  </p>
                </div>

                {/* Dev OTP Helper Box */}
                {devOtp && (
                  <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 text-center space-y-1">
                    <span className="text-[11px] font-bold text-amber-900 block">
                      🔔 رمز التحقق الفعلي (للتجربة السريعة):
                    </span>
                    <span className="text-2xl font-black font-mono tracking-widest text-slate-950 block">
                      {devOtp}
                    </span>
                  </div>
                )}

                {authError && (
                  <div className="bg-red-50 text-red-800 text-xs p-3 rounded-xl border border-red-300 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                <div>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full text-center text-2xl font-mono tracking-widest font-black bg-slate-50 border border-slate-300 rounded-xl py-3 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{authLoading ? 'جاري التحقق...' : 'تأكيد الرمز ودخول لوحة التحكم'}</span>
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setAuthStep('LOGIN')}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    الرجوع لتسجيل الدخول
                  </button>
                </div>
              </form>
            )}

            {authStep === 'EMERGENCY' && (
              <form onSubmit={handleEmergencyLogin} className="p-8 space-y-5">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-inner">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    رمز استرداد الطوارئ (Emergency Access)
                  </h3>
                  <p className="text-xs text-slate-500">
                    آلية الحماية والإنقاذ المشفرة في حال انقطاع شبكة واتساب أو الرسائل
                  </p>
                </div>

                {authError && (
                  <div className="bg-red-50 text-red-800 text-xs p-3 rounded-xl border border-red-300 font-bold">
                    {authError}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اسم المستخدم:
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رمز الاسترداد المشفر (Hashed Recovery Code):
                    </label>
                    <input
                      type="text"
                      placeholder="MOTAHEDA-XXXX-XXXX-XXXX"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono"
                    />
                  </div>
                </div>

                <div className="bg-red-50 p-3 rounded-xl text-[11px] text-red-700 border border-red-200">
                  <span className="font-bold block">ملاحظة أمنية صارمة:</span>
                  <span>رموز الاسترداد صالحة للاستخدام لمرة واحدة فقط ويتم إتلافها فور التحقق لحماية النظام.</span>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2"
                >
                  <span>دخول اضطراري للوحة الإدارة</span>
                </button>
              </form>
            )}
          </div>
        ) : (
          /* ================================================= */
          /* AUTHENTICATED ADMIN DASHBOARD & TABS              */
          /* ================================================= */
          <div className="space-y-6">
            {/* Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('OVERVIEW')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'OVERVIEW'
                      ? 'bg-amber-400 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>المؤشرات المالية والتشغيلية</span>
                </button>
                <button
                  onClick={() => setActiveTab('ORDERS')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'ORDERS'
                      ? 'bg-amber-400 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>إدارة الطلبات ({orders.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('PRODUCTS')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'PRODUCTS'
                      ? 'bg-amber-400 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Boxes className="w-4 h-4" />
                  <span>المخزون والأصناف ({products.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('SHIPPING')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'SHIPPING'
                      ? 'bg-amber-400 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>مصفوفة الشحن والفروع</span>
                </button>
                <button
                  onClick={() => setActiveTab('AUDIT')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'AUDIT'
                      ? 'bg-amber-400 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>سجل التدقيق والأمان ({auditLogs.length})</span>
                </button>
              </div>

              <button
                onClick={loadDashboard}
                disabled={loadingData}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                <span>تحديث البيانات</span>
              </button>
            </div>

            {/* TAB 1: OVERVIEW & FINANCIAL KPIS */}
            {activeTab === 'OVERVIEW' && dashboardData && (
              <div className="space-y-6">
                {/* KPI Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Verified Net Revenue */}
                  <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-2">
                      <span>الإيرادات المحصلة المعتمدة</span>
                      <Coins className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-black font-mono text-emerald-400">
                      {dashboardData.kpis.verifiedCollectedRevenue} <span className="text-xs font-sans text-slate-400">ج.م</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      المدفوعات الإلكترونية المؤكدة عبر بايموب فقط
                    </p>
                  </div>

                  {/* Gross Order Value */}
                  <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between text-xs text-amber-400 font-bold mb-2">
                      <span>إجمالي قيمة الطلبات (Gross)</span>
                      <DollarSign className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="text-2xl font-black font-mono text-amber-400">
                      {dashboardData.kpis.grossOrderValue} <span className="text-xs font-sans text-slate-400">ج.م</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      تشمل طلبات الدفع عند الاستلام الجارية
                    </p>
                  </div>

                  {/* Total Orders */}
                  <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between text-xs text-blue-400 font-bold mb-2">
                      <span>إجمالي الطلبات المسجلة</span>
                      <Package className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-2xl font-black font-mono text-white">
                      {dashboardData.kpis.totalOrdersCount} <span className="text-xs font-sans text-slate-400">طلب</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                      <span>مؤكد: {dashboardData.kpis.ordersByStatus.CONFIRMED || 0}</span>
                      <span>تجهيز: {dashboardData.kpis.ordersByStatus.PROCESSING || 0}</span>
                    </div>
                  </div>

                  {/* Low Stock Alerts */}
                  <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between text-xs text-red-400 font-bold mb-2">
                      <span>تنبيهات انخفاض المخزون</span>
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="text-2xl font-black font-mono text-red-400">
                      {dashboardData.kpis.lowStockCount} <span className="text-xs font-sans text-slate-400">صنف</span>
                    </div>
                    <p className="text-[11px] text-red-300 mt-1">
                      أصناف قاربت على النفاد من المخزن
                    </p>
                  </div>
                </div>

                {/* Low Stock Items Section */}
                {dashboardData.lowStockProducts.length > 0 && (
                  <div className="bg-slate-800/90 border border-amber-500/30 rounded-2xl p-5 text-white">
                    <h4 className="font-extrabold text-sm text-amber-400 flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4" />
                      أصناف تستوجب أمر توريد جديد (الرصيد تحت الحد الأدنى):
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {dashboardData.lowStockProducts.map((p: Product) => (
                        <div key={p.id} className="bg-slate-900/80 border border-slate-700 rounded-xl p-3 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-white block">{p.titleAr}</span>
                            <span className="text-slate-400 font-mono text-[11px]">{p.sku} • {p.brand}</span>
                          </div>
                          <div className="text-left font-mono">
                            <span className="text-amber-400 font-black text-sm block">متبقي: {p.stockQuantity} قطع</span>
                            <span className="text-slate-400 text-[10px]">الحد: {p.lowStockThreshold}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ORDER MANAGEMENT */}
            {activeTab === 'ORDERS' && (
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 text-white space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-amber-400" />
                    سجل ومتابعة الطلبات ومراحل التجهيز
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 font-bold">
                        <th className="pb-3 pr-2">رقم الطلب</th>
                        <th className="pb-3">العميل</th>
                        <th className="pb-3">الهاتف</th>
                        <th className="pb-3">الاستلام</th>
                        <th className="pb-3">المبلغ الإجمالي</th>
                        <th className="pb-3">الدفع</th>
                        <th className="pb-3">حالة الطلب</th>
                        <th className="pb-3 pl-2">إجراء تغيير الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60">
                      {orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="py-3 pr-2 font-mono font-bold text-amber-400">
                            {ord.orderNumber}
                          </td>
                          <td className="py-3 font-semibold text-white">{ord.customerName}</td>
                          <td className="py-3 font-mono text-slate-300">{ord.customerPhone}</td>
                          <td className="py-3 text-slate-300">
                            {ord.fulfillmentMethod === 'PICKUP' ? 'استلام فرع' : ord.governorate}
                          </td>
                          <td className="py-3 font-mono font-bold text-emerald-400">
                            {ord.finalTotal} ج.م
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ord.paymentStatus === 'PAID'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {ord.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="bg-slate-700 px-2.5 py-1 rounded-full text-[10px] font-black">
                              {ord.orderStatus}
                            </span>
                          </td>
                          <td className="py-3 pl-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {ord.orderStatus === 'PENDING' && (
                                <button
                                  onClick={() => handleTransitionOrder(ord.id, 'CONFIRMED')}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[11px] font-bold"
                                >
                                  تأكيد الطلب
                                </button>
                              )}
                              {ord.orderStatus === 'CONFIRMED' && (
                                <button
                                  onClick={() => handleTransitionOrder(ord.id, 'PROCESSING')}
                                  className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-[11px] font-bold"
                                >
                                  بدء التجهيز
                                </button>
                              )}
                              {ord.orderStatus === 'PROCESSING' && (
                                <button
                                  onClick={() => handleTransitionOrder(ord.id, 'SHIPPED')}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded text-[11px] font-bold"
                                >
                                  تم الشحن
                                </button>
                              )}
                              {ord.orderStatus === 'SHIPPED' && (
                                <button
                                  onClick={() => handleTransitionOrder(ord.id, 'DELIVERED')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[11px] font-bold"
                                >
                                  تم التسليم
                                </button>
                              )}
                              {ord.orderStatus !== 'DELIVERED' && ord.orderStatus !== 'CANCELLED' && (
                                <button
                                  onClick={() => handleTransitionOrder(ord.id, 'CANCELLED')}
                                  className="bg-red-600/80 hover:bg-red-600 text-white px-2 py-1 rounded text-[11px] font-bold"
                                >
                                  إلغاء
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: PRODUCTS & INVENTORY */}
            {activeTab === 'PRODUCTS' && (
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 text-white space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-amber-400" />
                    كتالوج المهمات الكهربائية والأرصدة
                  </h3>
                  <button
                    onClick={() => setIsAddingProduct(true)}
                    className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة صنف جديد</span>
                  </button>
                </div>

                {isAddingProduct && (
                  <form onSubmit={handleAddProduct} className="bg-slate-900 p-4 rounded-xl border border-amber-400/40 space-y-3">
                    <h4 className="font-bold text-xs text-amber-400">إدخال صنف كهربائي جديد للمخزن:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <input
                        type="text"
                        placeholder="اسم الصنف بالعربي *"
                        value={newTitleAr}
                        onChange={(e) => setNewTitleAr(e.target.value)}
                        required
                        className="bg-slate-800 border border-slate-700 rounded-lg p-2"
                      />
                      <input
                        type="text"
                        placeholder="كود SKU *"
                        value={newSku}
                        onChange={(e) => setNewSku(e.target.value)}
                        required
                        className="bg-slate-800 border border-slate-700 rounded-lg p-2 font-mono"
                      />
                      <input
                        type="text"
                        placeholder="الماركة (السويدي، شنايدر...)"
                        value={newBrand}
                        onChange={(e) => setNewBrand(e.target.value)}
                        required
                        className="bg-slate-800 border border-slate-700 rounded-lg p-2"
                      />
                      <input
                        type="number"
                        placeholder="السعر (ج.م)"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        required
                        className="bg-slate-800 border border-slate-700 rounded-lg p-2"
                      />
                      <input
                        type="number"
                        placeholder="الكمية المتاحة بالمخزن"
                        value={newStock}
                        onChange={(e) => setNewStock(e.target.value)}
                        required
                        className="bg-slate-800 border border-slate-700 rounded-lg p-2"
                      />
                      <input
                        type="text"
                        placeholder="الجهد (مثال: 220V أو 380V)"
                        value={newVoltage}
                        onChange={(e) => setNewVoltage(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-lg p-2"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingProduct(false)}
                        className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs"
                      >
                        حفظ الصنف وتحديث المخزن
                      </button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 font-bold">
                        <th className="pb-3 pr-2">الصنف</th>
                        <th className="pb-3">كود SKU</th>
                        <th className="pb-3">الماركة</th>
                        <th className="pb-3">السعر</th>
                        <th className="pb-3">الرصيد الفعلي</th>
                        <th className="pb-3">الحد الأدنى</th>
                        <th className="pb-3 pl-2">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="py-3 pr-2 font-bold text-white max-w-xs truncate">{p.titleAr}</td>
                          <td className="py-3 font-mono text-slate-300">{p.sku}</td>
                          <td className="py-3 text-slate-300">{p.brand}</td>
                          <td className="py-3 font-mono font-bold text-amber-400">{p.basePrice} ج.م</td>
                          <td className="py-3 font-mono font-bold">
                            <span className={p.stockQuantity <= p.lowStockThreshold ? 'text-red-400' : 'text-emerald-400'}>
                              {p.stockQuantity} قطعة
                            </span>
                          </td>
                          <td className="py-3 font-mono text-slate-400">{p.lowStockThreshold}</td>
                          <td className="py-3 pl-2">
                            <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">
                              نشط بالمخزن
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: SHIPPING & PICKUP MATRIX */}
            {activeTab === 'SHIPPING' && (
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 text-white space-y-4">
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-amber-400" />
                  مصفوفة أسعار الشحن والتوصيل للمحافظات
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shippingZones.map((zone) => (
                    <div key={zone.id} className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 space-y-3 text-xs">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <span className="font-black text-sm text-amber-400">{zone.nameAr}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleUpdateZone(
                                zone.id,
                                zone.defaultFee,
                                zone.mode === 'FLAT' ? 'DISTRICT' : 'FLAT'
                              )
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              zone.mode === 'FLAT'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            }`}
                          >
                            الوضع: {zone.mode === 'FLAT' ? 'سعر موحد' : 'حسب الحي'}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-slate-300">
                        <span>السعر الأساسي / الموحد:</span>
                        <span className="font-mono font-bold text-white text-sm">{zone.defaultFee} ج.م</span>
                      </div>

                      {zone.subZones.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="font-bold text-slate-400 block text-[11px]">الأحياء والمناطق التابعة:</span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {zone.subZones.map((s) => (
                              <div key={s.id} className="bg-slate-800/80 px-2 py-1 rounded flex justify-between">
                                <span className="text-slate-300">{s.nameAr}</span>
                                <span className="font-mono text-amber-400 font-bold">{s.shippingFee} ج.م</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: IMMUTABLE AUDIT LOGS */}
            {activeTab === 'AUDIT' && (
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 text-white space-y-4">
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  سجل التدقيق الأمني والعمليات (Audit Log)
                </h3>
                <p className="text-xs text-slate-400">
                  سجل غير قابل للتعديل يوثق كافة التغييرات على الأسعار والطلبات والمخزون مع اسم المشرف والتوقيت.
                </p>

                <div className="divide-y divide-slate-700/60 max-h-96 overflow-y-auto pr-1">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="py-3 flex items-start gap-3 text-xs">
                      <span className="font-mono text-[10px] text-slate-400 pt-0.5 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString('ar-EG')}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-400">{log.action}</span>
                          <span className="text-slate-400">• بواسطة: {log.actor} ({log.role})</span>
                        </div>
                        <p className="text-slate-300 text-[11px] mt-0.5">{log.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
