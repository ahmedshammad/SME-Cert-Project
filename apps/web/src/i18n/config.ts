import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Common
      'common.loading': 'Loading...',
      'common.error': 'An error occurred',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.search': 'Search',
      'common.back': 'Back',
      'common.next': 'Next',
      'common.submit': 'Submit',
      'common.learn_more': 'Learn More',

      // Navigation
      'nav.home': 'Home',
      'nav.login': 'Sign In',
      'nav.register': 'Register',
      'nav.dashboard': 'Dashboard',
      'nav.templates': 'Templates',
      'nav.certificates': 'Certificates',
      'nav.verify': 'Verify',
      'nav.settings': 'Settings',
      'nav.logout': 'Logout',
      'nav.about': 'About',
      'nav.why_blockchain': 'Why Blockchain',
      'nav.how_it_works': 'How It Works',
      'nav.docs': 'Documentation',
      'nav.pricing': 'Pricing',
      'nav.deployment': 'Deployment',
      'nav.contact': 'Contact',
      'nav.onboarding': 'Get Started',
      'nav.platform': 'Platform',
      'nav.business': 'Business',

      // Landing
      'landing.title': 'Empowering Egypt\'s SMEs with Trusted Digital Certificates',
      'landing.subtitle': 'Blockchain-powered certificate issuance, verification, and management — aligned with Egypt Vision 2030',
      'landing.cta': 'Register Organization',
      'landing.verify_cta': 'Verify a Certificate',
      'landing.demo_cta': 'Request Demo',
      'landing.supervision': 'Under the supervision of Professor Ghada El Khayat, Faculty of Commerce, Alexandria University',
      'landing.how_it_works': 'How It Works',
      'landing.benefits': 'Key Benefits',
      'landing.impact': 'Platform Impact',
      'landing.trust': 'Why Trust This Platform',

      // Auth
      'auth.login': 'Sign In',
      'auth.register': 'Create Account',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.confirm_password': 'Confirm Password',
      'auth.first_name': 'First Name',
      'auth.last_name': 'Last Name',
      'auth.organization': 'Organization',
      'auth.forgot_password': 'Forgot password?',
      'auth.no_account': "Don't have an account?",
      'auth.has_account': 'Already have an account?',
      'auth.remember_me': 'Remember me',
      'auth.terms_agree': 'I agree to the Terms of Service and Privacy Policy',

      // Dashboard
      'dashboard.total_issued': 'Total Issued',
      'dashboard.active_certs': 'Active Certificates',
      'dashboard.revoked': 'Revoked',
      'dashboard.expiring_soon': 'Expiring Soon',
      'dashboard.from_last_month': 'from last month',

      // Issuer
      'issuer.dashboard.title': 'Issuer Dashboard',
      'issuer.dashboard.subtitle': 'Manage your certificate issuance and verification',
      'issuer.dashboard.issuance_trend': 'Issuance Trend',
      'issuer.dashboard.last_30_days': 'Last 30 days',
      'issuer.dashboard.verification_activity': 'Verification Activity',
      'issuer.dashboard.verification_requests': 'Recent verification requests',
      'issuer.dashboard.recent_activity': 'Recent Activity',
      'issuer.dashboard.recent_certificates': 'Recently issued certificates',
      'issuer.issue_certificate': 'Issue Certificate',
      'issuer.templates': 'Certificate Templates',
      'issuer.revocation': 'Revocation Management',

      // Holder
      'holder.dashboard.title': 'My Certificates',
      'holder.dashboard.subtitle': 'View and manage your digital certificates',
      'holder.share': 'Share Center',
      'holder.wallet': 'Wallet Settings',

      // Verifier
      'verifier.dashboard.title': 'Verification Portal',
      'verifier.dashboard.subtitle': 'Verify certificate authenticity',
      'verifier.history': 'Verification History',

      // Verify Page
      'verify.title': 'Verify a Certificate',
      'verify.subtitle': 'Instantly verify the authenticity of any certificate using ID lookup, QR code scan, or file upload.',
      'verify.placeholder': 'Enter certificate ID...',
      'verify.button': 'Verify',
      'verify.scan_qr': 'Scan QR Code',
      'verify.file_upload': 'File Upload',
      'verify.valid': 'Certificate is Valid',
      'verify.invalid': 'Certificate is Invalid',
      'verify.revoked': 'Certificate has been Revoked',
      'verify.expired': 'Certificate has Expired',
      'verify.mismatch': 'Hash Mismatch',
      'verify.another': 'Verify Another',
      'verify.download_report': 'Download Report',

      // Public Pages
      'about.title': 'About the Platform',
      'about.subtitle': 'Blockchain-based certificate management aligned with Egypt Vision 2030',
      'why_blockchain.title': 'Why Blockchain?',
      'why_blockchain.subtitle': 'Understanding why blockchain anchoring provides superior trust for digital certificates',
      'how_it_works.title': 'How It Works',
      'how_it_works.subtitle': 'A step-by-step guide to the certificate lifecycle',
      'docs.title': 'Documentation',
      'docs.subtitle': 'Technical documentation and platform architecture',
      'pricing.title': 'Pricing Plans',
      'pricing.subtitle': 'Flexible plans for organizations of every size',
      'deployment.title': 'Deployment Options',
      'deployment.subtitle': 'Choose the deployment model that fits your organization',
      'contact.title': 'Contact Us',
      'contact.subtitle': 'Get in touch with our team',
      'onboarding.title': 'Get Started',
      'onboarding.subtitle': 'Register your organization on the platform',
    },
  },
  ar: {
    translation: {
      'common.loading': '...جاري التحميل',
      'common.error': 'حدث خطأ',
      'common.back': 'رجوع',
      'common.next': 'التالي',

      'nav.home': 'الرئيسية',
      'nav.login': 'تسجيل الدخول',
      'nav.register': 'إنشاء حساب',
      'nav.verify': 'التحقق',
      'nav.dashboard': 'لوحة التحكم',
      'nav.about': 'عن المنصة',
      'nav.contact': 'اتصل بنا',
      'nav.pricing': 'الأسعار',

      'landing.title': 'تمكين الشركات المصرية الصغيرة والمتوسطة بشهادات رقمية موثوقة',
      'landing.subtitle': 'إصدار الشهادات والتحقق منها وإدارتها بتقنية البلوكتشين — تماشياً مع رؤية مصر 2030',

      'auth.login': 'تسجيل الدخول',
      'auth.register': 'إنشاء حساب',
      'auth.email': 'البريد الإلكتروني',
      'auth.password': 'كلمة المرور',
      'auth.first_name': 'الاسم الأول',
      'auth.last_name': 'اسم العائلة',
      'auth.organization': 'المنظمة',

      'verify.title': 'التحقق من الشهادة',
      'verify.subtitle': 'تحقق فوراً من صحة أي شهادة باستخدام رقم الشهادة أو رمز QR أو رفع الملف',

      'about.title': 'عن المنصة',
      'pricing.title': 'خطط الأسعار',
      'contact.title': 'اتصل بنا',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
