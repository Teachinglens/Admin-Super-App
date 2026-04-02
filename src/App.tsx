import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  User, 
  School, 
  MapPin, 
  Calendar, 
  Clock,
  GitMerge,
  CheckCircle2,
  BookOpen, 
  Layers, 
  Target, 
  Send, 
  Copy, 
  Check, 
  Loader2,
  RotateCcw,
  Trash2,
  ChevronRight,
  Info,
  Download,
  LogOut,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  MessageCircle,
  Key,
  Lock,
  Unlock,
  Mail,
  UserPlus,
  Zap,
  Menu,
  X,
  Users,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { cn } from './lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Types
type DocumentType = 'PROMES' | 'PROTA' | 'ATP' | 'KKTP';
type TabType = 'input' | 'administrasi' | 'preview' | 'admin';
type AuthState = 'login' | 'register' | 'activate' | 'dashboard';
type PackageType = 'Basic' | 'Premium';

interface UserData {
  email: string;
  package: PackageType;
  downloadsLeft: number;
  isActivated: boolean;
  activationCode?: string;
  password?: string;
  namaGelar?: string;
  role?: 'admin' | 'user';
  nip_guru?: string;
  nama_sekolah?: string;
  nama_kepsek?: string;
  nip_kepsek?: string;
}

interface FormData {
  nama_guru: string;
  nip_guru: string;
  nama_sekolah: string;
  nama_kepsek: string;
  nip_kepsek: string;
  tempat: string;
  tanggal: string;
  mapel: string;
  jenjang: string;
  kelas: string;
  tahun_pelajaran: string;
  semester: string;
  jenis_dokumen: DocumentType;
}

const INITIAL_FORM_DATA: FormData = {
  nama_guru: '',
  nip_guru: '',
  nama_sekolah: '',
  nama_kepsek: '',
  nip_kepsek: '',
  tempat: '',
  tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
  mapel: '',
  jenjang: 'SMA',
  kelas: '',
  tahun_pelajaran: '2023/2024',
  semester: '1 (Ganjil)',
  jenis_dokumen: 'PROTA',
};

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('login');
  const [activeTab, setActiveTab] = useState<TabType>('input');
  const [user, setUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isProfileLocked, setIsProfileLocked] = useState<boolean>(false);
  
  // Auth Form States
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authNamaGelar, setAuthNamaGelar] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<PackageType>('Basic');
  const [allUsers, setAllUsers] = useState<UserData[]>([]);

  const previewRef = useRef<HTMLDivElement>(null);

  // Initialize AI
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const saveUser = (userData: UserData) => {
    // Load persistent profile fields
    const profiles = JSON.parse(localStorage.getItem('guru_profiles') || '{}');
    const profile = profiles[userData.email] || {};
    
    const mergedUser = {
      ...userData,
      nama_guru: profile.nama_guru || userData.namaGelar || '',
      nip_guru: profile.nip_guru || '',
      nama_sekolah: profile.nama_sekolah || '',
      nama_kepsek: profile.nama_kepsek || '',
      nip_kepsek: profile.nip_kepsek || '',
    };

    setUser(mergedUser);
    localStorage.setItem('guru_user', JSON.stringify(mergedUser));
    setIsProfileLocked(!!profile.isLocked);
    
    // Update formData with merged data
    setFormData(prev => ({
      ...prev,
      nama_guru: mergedUser.nama_guru || mergedUser.namaGelar || '',
      nip_guru: mergedUser.nip_guru || '',
      nama_sekolah: mergedUser.nama_sekolah || '',
      nama_kepsek: mergedUser.nama_kepsek || '',
      nip_kepsek: mergedUser.nip_kepsek || '',
    }));
  };

  // Persistence
  useEffect(() => {
    const savedUser = localStorage.getItem('guru_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser) as UserData;
      // Fallback for admin role if missing in storage
      if (parsedUser.email === 'barlimahardikasandy@gmail.com' && !parsedUser.role) {
        parsedUser.role = 'admin';
      }
      
      // Load persistent profile fields
      const profiles = JSON.parse(localStorage.getItem('guru_profiles') || '{}');
      const profile = profiles[parsedUser.email] || {};
      
      const mergedUser = {
        ...parsedUser,
        nama_guru: profile.nama_guru || parsedUser.namaGelar || '',
        nip_guru: profile.nip_guru || parsedUser.nip_guru || '',
        nama_sekolah: profile.nama_sekolah || parsedUser.nama_sekolah || '',
        nama_kepsek: profile.nama_kepsek || parsedUser.nama_kepsek || '',
        nip_kepsek: profile.nip_kepsek || parsedUser.nip_kepsek || '',
      };

      setUser(mergedUser);
      setAuthState('dashboard');
      setIsProfileLocked(!!profile.isLocked);
      
      // Refresh user data from spreadsheet to ensure name is correct
      const refreshUser = async () => {
        const res = await callGAS({ action: 'getUser', email: parsedUser.email });
        if (res.status === 'success') {
          saveUser(res.user);
        }
      };
      refreshUser();
    }
  }, []);

  const fetchAllUsers = async () => {
    if (user?.role !== 'admin' && user?.email !== 'barlimahardikasandy@gmail.com') return;
    const res = await callGAS({ action: 'getUsers', adminEmail: user.email });
    if (res.status === 'success') {
      setAllUsers(res.users);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin') {
      fetchAllUsers();
    }
  }, [activeTab]);

  const logout = () => {
    setUser(null);
    setAuthState('login');
    localStorage.removeItem('guru_user');
    resetForm();
  };

  const toggleProfileLock = () => {
    if (!user) return;
    const newLockState = !isProfileLocked;
    setIsProfileLocked(newLockState);
    
    const profiles = JSON.parse(localStorage.getItem('guru_profiles') || '{}');
    profiles[user.email] = {
      ...(profiles[user.email] || {}),
      isLocked: newLockState
    };
    localStorage.setItem('guru_profiles', JSON.stringify(profiles));
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setResult('');
    setError(null);
  };

  // API Calls to GAS
  const callGAS = async (payload: any) => {
    try {
      const response = await fetch('/api/gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (err) {
      console.error("GAS Error:", err);
      return { status: 'error', message: 'Koneksi ke server gagal.' };
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const res = await callGAS({ action: 'login', email: authEmail, password: authPassword });
    
    if (res.status === 'success') {
      saveUser(res.user);
      setAuthState('dashboard');
    } else {
      setError(res.message);
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const res = await callGAS({ action: 'register', email: authEmail, package: 'Basic', namaGelar: authNamaGelar });
    
    if (res.status === 'success') {
      setAuthState('activate');
      setError('Registrasi berhasil! Silakan masukkan kode aktivasi yang Anda terima.');
    } else {
      setError(res.message);
    }
    setIsLoading(false);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const res = await callGAS({ action: 'activate', email: authEmail, code: activationCode });
    
    if (res.status === 'success') {
      saveUser(res.user);
      setAuthState('dashboard');
      // Show password to user
      alert(`Aktivasi Berhasil!\nPassword Anda: ${res.user.password}\nHarap simpan password ini untuk login.`);
    } else {
      setError(res.message);
    }
    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Persistence for specific fields
    const persistentFields = ['nama_guru', 'nip_guru', 'nama_sekolah', 'nama_kepsek', 'nip_kepsek'];
    if (persistentFields.includes(name) && user) {
      const profiles = JSON.parse(localStorage.getItem('guru_profiles') || '{}');
      profiles[user.email] = {
        ...(profiles[user.email] || {}),
        [name]: value
      };
      localStorage.setItem('guru_profiles', JSON.stringify(profiles));
      
      setUser({ ...user, [name]: value });
    }

    if (name === 'jenjang') {
      setFormData(prev => ({ ...prev, [name]: value, kelas: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const getKelasOptions = (jenjang: string) => {
    switch (jenjang) {
      case 'SD': return ['1', '2', '3', '4', '5', '6'];
      case 'SMP': return ['7', '8', '9'];
      case 'SMA':
      case 'SMK': return ['10', '11', '12'];
      default: return [];
    }
  };

  const handleUpdateUser = async (targetEmail: string, newPackage: string, newDownloads: number) => {
    if (user?.role !== 'admin' && user?.email !== 'barlimahardikasandy@gmail.com') return;
    const res = await callGAS({ 
      action: 'updateUser', 
      adminEmail: user?.email, 
      targetEmail, 
      newPackage, 
      newDownloads 
    });
    if (res.status === 'success') {
      fetchAllUsers();
    }
  };

  const generateDocument = async () => {
    if (!formData.nama_guru || !formData.mapel || !formData.kelas) {
      setError('Mohon lengkapi data wajib: Nama Guru, Mata Pelajaran, dan Kelas.');
      return;
    }

    if (user && user.package === 'Basic' && user.downloadsLeft <= 0) {
      setError("Kuota Anda telah habis (30/30). Silakan upgrade ke Premium.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult('');

    try {
      let prompt = '';
      
      if (formData.jenis_dokumen === 'PROTA') {
        prompt = `
          Buatlah draf profesional untuk dokumen STRUKTUR PROGRAM TAHUNAN Kurikulum Merdeka.
          
          Gunakan struktur berikut secara eksis:
          
          STRUKTUR PROGRAM TAHUNAN
          
          Satuan Pendidikan : ${formData.nama_sekolah}
          Mata Pelajaran    : ${formData.mapel}
          Fase/Kelas        : ${formData.jenjang} / ${formData.kelas}
          Tahun Pelajaran   : ${formData.tahun_pelajaran}
          
          A. Capaian Pembelajaran (CP)
          (Tuliskan CP sesuai fase dan mata pelajaran ini)
          
          B. Tujuan Pembelajaran (Ringkas Global)
          
          C. Alokasi Waktu 1 Tahun
          
          | Semester | Materi Pokok | Alokasi Waktu (JP) |
          |----------|--------------|--------------------|
          | 1 (Ganjil) | ... | ... JP |
          | 1 (Ganjil) | ... | ... JP |
          | 2 (Genap) | ... | ... JP |
          | 2 (Genap) | ... | ... JP |
          
          D. Kalender Efektif (Opsional)
          
          Mengetahui,
          Kepala Sekolah
          
          ${formData.nama_kepsek}
          NIP. ${formData.nip_kepsek}
          
          Guru Mata Pelajaran
          
          ${formData.nama_guru}
          NIP. ${formData.nip_guru}
          
          Gunakan bahasa Indonesia yang formal, edukatif, dan sesuai standar Kemdikbudristek.
          Isi bagian yang kosong (...) dengan materi yang relevan untuk mata pelajaran dan kelas tersebut.
          Format output menggunakan Markdown yang rapi.
        `;
      } else if (formData.jenis_dokumen === 'PROMES') {
        prompt = `
          Buatlah draf profesional untuk dokumen PROGRAM SEMESTER Kurikulum Merdeka.
          
          Gunakan struktur berikut secara eksis:
          
          PROGRAM SEMESTER
          
          Satuan Pendidikan : ${formData.nama_sekolah}
          Mata Pelajaran    : ${formData.mapel}
          Kelas/Fase        : ${formData.jenjang} / ${formData.kelas}
          Semester          : ${formData.semester}
          Tahun Pelajaran   : ${formData.tahun_pelajaran}
          
          A. Capaian Pembelajaran
          (Tuliskan CP sesuai fase dan mata pelajaran ini)
          
          B. Tujuan Pembelajaran
          
          C. Rencana Pembelajaran
          
          | Minggu Ke- | Materi Pokok | Tujuan Pembelajaran | Alokasi JP |
          |------------|--------------|---------------------|------------|
          | 1 | ... | ... | ... |
          | 2 | ... | ... | ... |
          | 3 | ... | ... | ... |
          | 4 | ... | ... | ... |
          | 5 | ... | ... | ... |
          | 6 | ... | ... | ... |
          
          D. Penilaian
          
          Mengetahui,
          Kepala Sekolah
          
          ${formData.nama_kepsek}
          NIP. ${formData.nip_kepsek}
          
          Guru Mata Pelajaran
          
          ${formData.nama_guru}
          NIP. ${formData.nip_guru}
          
          Gunakan bahasa Indonesia yang formal, edukatif, dan sesuai standar Kemdikbudristek.
          Isi bagian yang kosong (...) dengan materi yang relevan untuk mata pelajaran, kelas, dan semester tersebut.
          Format output menggunakan Markdown yang rapi.
        `;
      } else if (formData.jenis_dokumen === 'ATP') {
        prompt = `
          Buatlah draf profesional untuk dokumen ALUR TUJUAN PEMBELAJARAN (ATP) Kurikulum Merdeka.
          
          Gunakan struktur berikut secara eksis:
          
          ALUR TUJUAN PEMBELAJARAN (ATP)
          
          Satuan Pendidikan : ${formData.nama_sekolah}
          Mata Pelajaran    : ${formData.mapel}
          Fase/Kelas        : ${formData.jenjang} / ${formData.kelas}
          
          A. Capaian Pembelajaran (CP)
          (Tuliskan CP sesuai fase dan mata pelajaran ini)
          
          B. Alur Tujuan Pembelajaran
          
          | No | Tujuan Pembelajaran | Materi Pokok | Indikator Ketercapaian | Alokasi Waktu |
          |----|--------------------|--------------|------------------------|---------------|
          | 1 | ... | ... | ... | ... |
          | 2 | ... | ... | ... | ... |
          | 3 | ... | ... | ... | ... |
          | 4 | ... | ... | ... | ... |
          | 5 | ... | ... | ... | ... |
          
          C. Profil Pelajar Pancasila (Opsional)
          
          Mengetahui,
          Kepala Sekolah
          
          ${formData.nama_kepsek}
          NIP. ${formData.nip_kepsek}
          
          Guru
          
          ${formData.nama_guru}
          NIP. ${formData.nip_guru}
          
          Gunakan bahasa Indonesia yang formal, edukatif, dan sesuai standar Kemdikbudristek.
          Isi bagian yang kosong (...) dengan materi dan tujuan yang relevan untuk mata pelajaran dan kelas tersebut.
          Format output menggunakan Markdown yang rapi.
        `;
      } else if (formData.jenis_dokumen === 'KKTP') {
        prompt = `
          Buatlah draf profesional untuk dokumen KKTP (Kriteria Ketercapaian Tujuan Pembelajaran) Kurikulum Merdeka.
          
          Gunakan struktur berikut secara eksis:
          
          KKTP
          
          Satuan Pendidikan : ${formData.nama_sekolah}
          Mata Pelajaran    : ${formData.mapel}
          Kelas/Fase        : ${formData.jenjang} / ${formData.kelas}
          
          A. Tujuan Pembelajaran
          (Tuliskan tujuan pembelajaran yang relevan untuk mata pelajaran dan kelas ini)
          
          B. Kriteria Ketercapaian
          
          | Tujuan Pembelajaran | Indikator Asesmen | Kriteria Ketuntasan | Metode |
          |---------------------|-------------------|---------------------|--------|
          | ... | ... | 0-60% (Belum), 61-80% (Cukup), 81-100% (Sangat Baik) | ... |
          | ... | ... | 0-60% (Belum), 61-80% (Cukup), 81-100% (Sangat Baik) | ... |
          
          C. Teknik Penilaian
          - Observasi
          - Tes praktik
          - Penugasan
          
          D. Rubrik Penilaian (Opsional)
          
          Mengetahui,
          Kepala Sekolah
          
          ${formData.nama_kepsek}
          NIP. ${formData.nip_kepsek}
          
          Guru
          
          ${formData.nama_guru}
          NIP. ${formData.nip_guru}
          
          Gunakan bahasa Indonesia yang formal, edukatif, dan sesuai standar Kemdikbudristek.
          Isi bagian yang kosong (...) dengan materi, tujuan, dan indikator yang relevan untuk mata pelajaran dan kelas tersebut.
          Format output menggunakan Markdown yang rapi.
        `;
      } else {
        prompt = `
          Buatlah draf profesional untuk dokumen ${formData.jenis_dokumen} Kurikulum Merdeka.
          
          Detail:
          - Mata Pelajaran: ${formData.mapel}
          - Jenjang/Kelas: ${formData.jenjang} / ${formData.kelas}
          - Nama Guru: ${formData.nama_guru}
          
          Struktur Dokumen:
          1. Identitas Umum
          2. Kompetensi Awal
          3. Profil Pelajar Pancasila
          4. Sarana dan Prasarana
          5. Target Peserta Didik
          6. Model Pembelajaran
          7. Tujuan Pembelajaran (Minimal 3 poin)
          8. Pemahaman Bermakna
          9. Pertanyaan Pemantik
          10. Kegiatan Pembelajaran (Pendahuluan, Inti, Penutup)
          11. Asesmen
          
          Gunakan bahasa Indonesia yang formal, edukatif, dan sesuai standar Kemdikbudristek.
          Format output menggunakan Markdown yang rapi.
        `;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setResult(response.text);
      setActiveTab('preview');

      // Record generation and update quota
      if (user) {
        await callGAS({ 
          action: 'saveData', 
          email: user.email,
          nama_guru: formData.nama_guru,
          mapel: formData.mapel,
          jenis_dokumen: formData.jenis_dokumen,
          kelas: formData.kelas,
          semester: formData.semester,
          tahun: formData.tahun_pelajaran
        });
        
        const trackRes = await callGAS({ action: 'trackDownload', email: user.email });
        if (trackRes.status === 'success') {
          saveUser({ ...user, downloadsLeft: trackRes.downloadsLeft });
        }
      }
    } catch (err) {
      console.error("AI Error:", err);
      setError("Gagal menghasilkan dokumen. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!previewRef.current || !user) return;
    
    if (user.package === 'Basic' && user.downloadsLeft <= 0) {
      setError("Kuota download Basic Anda telah habis (30/30). Silakan upgrade ke Premium.");
      return;
    }

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const contentHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = contentHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, contentHeight);
      heightLeft -= pdfHeight;

      // Subsequent pages if content is longer than one A4 page
      while (heightLeft > 0) {
        position -= pdfHeight; // Move the image up by one page height
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, contentHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`${formData.jenis_dokumen}_${formData.nama_guru}.pdf`);
    } catch (err) {
      console.error("PDF Error:", err);
      setError("Gagal mengunduh PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Auth Screens
  if (authState === 'login' || authState === 'register' || authState === 'activate') {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-100"
        >
          <div className="bg-[#0056D2] p-8 text-white text-center">
            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">AdminGuru Pro</h1>
            <p className="text-blue-100 text-sm mt-1">Administrasi Guru Jadi Lebih Mudah</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {authState === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="email" 
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="nama@email.com"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="password" 
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <button 
                  disabled={isLoading}
                  className="w-full bg-[#0056D2] text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Masuk Sekarang"}
                </button>
                <p className="text-center text-sm text-gray-500">
                  Belum punya akun? <button type="button" onClick={() => setAuthState('register')} className="text-blue-600 font-bold">Daftar</button>
                </p>
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-center text-xs text-gray-500 mb-2">Butuh bantuan login?</p>
                  <a 
                    href="https://wa.me/6281234567890" 
                    target="_blank" 
                    className="w-full bg-green-50 text-green-600 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-green-100 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" /> Hubungi Admin via WhatsApp
                  </a>
                </div>
              </form>
            )}

            {authState === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Nama Lengkap & Gelar <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                       type="text" 
                       required
                       value={authNamaGelar}
                       onChange={(e) => setAuthNamaGelar(e.target.value)}
                       className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                       placeholder="Contoh: Dr. Budi Santoso, M.Pd"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Email <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="email" 
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="nama@email.com"
                    />
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-[10px] text-blue-700 font-medium">
                    Pendaftaran default adalah paket <b>Basic (30x Download)</b>. 
                    Untuk paket Premium, silakan hubungi admin setelah aktivasi.
                  </p>
                </div>
                <button 
                  disabled={isLoading}
                  className="w-full bg-[#0056D2] text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Daftar & Dapatkan Kode"}
                </button>
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-center text-xs text-gray-500 mb-2">Butuh bantuan pendaftaran?</p>
                  <a 
                    href="https://wa.me/6281234567890" 
                    target="_blank" 
                    className="w-full bg-green-50 text-green-600 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-green-100 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" /> Hubungi Admin via WhatsApp
                  </a>
                </div>
                <p className="text-center text-sm text-gray-500">
                  Sudah punya akun? <button type="button" onClick={() => setAuthState('login')} className="text-blue-600 font-bold">Masuk</button>
                </p>
              </form>
            )}

            {authState === 'activate' && (
              <form onSubmit={handleActivate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Kode Aktivasi</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      required
                      value={activationCode}
                      onChange={(e) => setActivationCode(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-center font-mono tracking-widest"
                      placeholder="KODE-XXXX"
                    />
                  </div>
                </div>
                <button 
                  disabled={isLoading}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Aktivasi Sekarang"}
                </button>
                <p className="text-center text-sm text-gray-500">
                  Butuh bantuan? <a href="https://wa.me/6281234567890" target="_blank" className="text-green-600 font-bold">Hubungi Admin</a>
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Dashboard Screen
  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="md:w-64 bg-white border-r border-gray-200 flex-shrink-0 md:sticky md:top-0 md:h-screen z-50 overflow-y-auto">
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-8">
            <div className="bg-[#0056D2] p-1.5 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">AdminGuru Pro</span>
          </div>

          <div className="flex-1 space-y-1">
            <button 
              onClick={() => setActiveTab('input')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === 'input' ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <User className="w-4 h-4" /> Input Data
            </button>
            <button 
              onClick={() => setActiveTab('administrasi')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === 'administrasi' ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <FileText className="w-4 h-4" /> Administrasi
            </button>
            <button 
              onClick={() => setActiveTab('preview')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === 'preview' ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <LayoutDashboard className="w-4 h-4" /> Preview
            </button>
            {(user?.role === 'admin' || user?.email === 'barlimahardikasandy@gmail.com') && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                  activeTab === 'admin' ? "bg-purple-50 text-purple-600" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                <ShieldCheck className="w-4 h-4" /> Monitoring User
              </button>
            )}
          </div>

          <div className="pt-6 border-t border-gray-100 mt-auto">
            <div className="mb-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Status Paket</p>
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                  user?.package === 'Premium' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                )}>
                  {user?.package}
                </span>
                {user?.package === 'Basic' && (
                  <span className="text-[10px] font-bold text-gray-600">
                    {user.downloadsLeft}/30
                  </span>
                )}
              </div>
              {user?.package === 'Basic' && (
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div className="bg-blue-600 h-1 rounded-full" style={{ width: `${(user.downloadsLeft / 30) * 100}%` }}></div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-900 truncate max-w-[120px]">{user?.email}</span>
                <button onClick={logout} className="text-[10px] font-bold text-red-500 hover:underline text-left">Keluar</button>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                {user?.email[0].toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <span className="font-bold">AdminGuru Pro</span>
          </div>
          <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2">
            {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile Menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-white border-t border-gray-100 overflow-hidden"
            >
              <div className="p-4 space-y-2">
                <button 
                  onClick={() => { setActiveTab('input'); setShowMobileMenu(false); }}
                  className={cn("w-full text-left px-4 py-3 rounded-xl font-medium", activeTab === 'input' ? "bg-blue-50 text-blue-600" : "text-gray-600")}
                >
                  Input Data
                </button>
                <button 
                  onClick={() => { setActiveTab('administrasi'); setShowMobileMenu(false); }}
                  className={cn("w-full text-left px-4 py-3 rounded-xl font-medium", activeTab === 'administrasi' ? "bg-blue-50 text-blue-600" : "text-gray-600")}
                >
                  Administrasi
                </button>
                <button 
                  onClick={() => { setActiveTab('preview'); setShowMobileMenu(false); }}
                  className={cn("w-full text-left px-4 py-3 rounded-xl font-medium", activeTab === 'preview' ? "bg-blue-50 text-blue-600" : "text-gray-600")}
                >
                  Preview
                </button>
                {(user?.role === 'admin' || user?.email === 'barlimahardikasandy@gmail.com') && (
                  <button 
                    onClick={() => { setActiveTab('admin'); setShowMobileMenu(false); }}
                    className={cn("w-full text-left px-4 py-3 rounded-xl font-medium", activeTab === 'admin' ? "bg-purple-50 text-purple-600" : "text-gray-600")}
                  >
                    Monitoring User
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'input' && (
            <motion.div 
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <div className="space-y-6">
                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h2 className="font-bold flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      Identitas Guru & Sekolah
                    </h2>
                    <button 
                      onClick={toggleProfileLock}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        isProfileLocked 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {isProfileLocked ? (
                        <><Lock className="w-3 h-3" /> Data Terkunci</>
                      ) : (
                        <><Unlock className="w-3 h-3" /> Kunci Data</>
                      )}
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama Lengkap & Gelar <span className="text-red-500">*</span></label>
                        <input 
                          name="nama_guru" 
                          value={formData.nama_guru} 
                          onChange={handleInputChange} 
                          readOnly={isProfileLocked}
                          className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all ${
                            isProfileLocked 
                            ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' 
                            : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500'
                          }`} 
                          placeholder="Nama Lengkap" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">NIP Guru <span className="text-red-500">*</span></label>
                        <input 
                          name="nip_guru" 
                          value={formData.nip_guru} 
                          onChange={handleInputChange} 
                          readOnly={isProfileLocked}
                          className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all ${
                            isProfileLocked 
                            ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' 
                            : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500'
                          }`} 
                          placeholder="19800101..." 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama Sekolah <span className="text-red-500">*</span></label>
                      <input 
                        name="nama_sekolah" 
                        value={formData.nama_sekolah} 
                        onChange={handleInputChange} 
                        readOnly={isProfileLocked}
                        className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all ${
                          isProfileLocked 
                          ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' 
                          : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500'
                        }`} 
                        placeholder="SMAN 1 Jakarta" 
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kepala Sekolah <span className="text-red-500">*</span></label>
                        <input 
                          name="nama_kepsek" 
                          value={formData.nama_kepsek} 
                          onChange={handleInputChange} 
                          readOnly={isProfileLocked}
                          className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all ${
                            isProfileLocked 
                            ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' 
                            : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500'
                          }`} 
                          placeholder="Nama Lengkap" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">NIP Kepsek <span className="text-red-500">*</span></label>
                        <input 
                          name="nip_kepsek" 
                          value={formData.nip_kepsek} 
                          onChange={handleInputChange} 
                          readOnly={isProfileLocked}
                          className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all ${
                            isProfileLocked 
                            ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' 
                            : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500'
                          }`} 
                          placeholder="NIP" 
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h2 className="font-bold flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      Detail Pembelajaran
                    </h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mata Pelajaran <span className="text-red-500">*</span></label>
                      <input name="mapel" value={formData.mapel} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Matematika, Biologi, dll" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jenjang <span className="text-red-500">*</span></label>
                        <select name="jenjang" value={formData.jenjang} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                          <option>SD</option>
                          <option>SMP</option>
                          <option>SMA</option>
                          <option>SMK</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kelas <span className="text-red-500">*</span></label>
                        <select name="kelas" value={formData.kelas} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                          <option value="">Pilih Kelas</option>
                          {getKelasOptions(formData.jenjang).map(k => (
                            <option key={k} value={k}>Kelas {k}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tahun Pelajaran <span className="text-red-500">*</span></label>
                        <input name="tahun_pelajaran" value={formData.tahun_pelajaran} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="2023/2024" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Semester <span className="text-red-500">*</span></label>
                        <select name="semester" value={formData.semester} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                          <option>1 (Ganjil)</option>
                          <option>2 (Genap)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </section>
                <button 
                  onClick={() => setActiveTab('administrasi')}
                  className="w-full bg-[#0056D2] text-white py-4 rounded-2xl font-bold shadow-lg hover:shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Lanjut ke Administrasi <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'administrasi' && (
            <motion.div 
              key="administrasi"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Pilih Dokumen Administrasi</h2>
                <p className="text-gray-500 mt-1">Pilih salah satu dokumen untuk dihasilkan oleh AI</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {[
                  { id: 'PROTA', title: 'Program Tahunan', desc: 'Rencana alokasi waktu satu tahun pelajaran', icon: <Calendar className="w-6 h-6" />, active: "border-blue-500 bg-blue-50 text-blue-600", iconActive: "bg-blue-500 text-white", iconInactive: "bg-blue-50 text-blue-600", dot: "bg-blue-500", bgShape: "bg-blue-500", indicator: "bg-blue-500" },
                  { id: 'PROMES', title: 'Program Semester', desc: 'Rincian materi per minggu dalam satu semester', icon: <Clock className="w-6 h-6" />, active: "border-emerald-500 bg-emerald-50 text-emerald-600", iconActive: "bg-emerald-500 text-white", iconInactive: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500", bgShape: "bg-emerald-500", indicator: "bg-emerald-500" },
                  { id: 'ATP', title: 'Alur Tujuan Pembelajaran', desc: 'Rangkaian tujuan pembelajaran yang sistematis', icon: <GitMerge className="w-6 h-6" />, active: "border-amber-500 bg-amber-50 text-amber-600", iconActive: "bg-amber-500 text-white", iconInactive: "bg-amber-50 text-amber-600", dot: "bg-amber-500", bgShape: "bg-amber-500", indicator: "bg-amber-500" },
                  { id: 'KKTP', title: 'Kriteria Ketercapaian', desc: 'Standar minimal ketuntasan tujuan pembelajaran', icon: <CheckCircle2 className="w-6 h-6" />, active: "border-purple-500 bg-purple-50 text-purple-600", iconActive: "bg-purple-500 text-white", iconInactive: "bg-purple-50 text-purple-600", dot: "bg-purple-500", bgShape: "bg-purple-500", indicator: "bg-purple-500" }
                ].map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => setFormData(prev => ({ ...prev, jenis_dokumen: item.id as DocumentType }))}
                    className={cn(
                      "group relative p-6 rounded-3xl border-2 transition-all duration-300 text-left overflow-hidden",
                      formData.jenis_dokumen === item.id 
                        ? `${item.active} shadow-xl scale-[1.02]` 
                        : "border-white bg-white hover:border-gray-200 shadow-sm hover:shadow-md"
                    )}
                  >
                    {/* Decorative Background Shape */}
                    <div className={cn(
                      "absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-110",
                      item.bgShape
                    )} />

                    <div className="relative z-10 flex flex-col gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:rotate-6",
                        formData.jenis_dokumen === item.id 
                          ? item.iconActive 
                          : item.iconInactive
                      )}>
                        {item.icon}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-gray-900">{item.id}</h3>
                          {formData.jenis_dokumen === item.id && (
                            <div className={cn(`w-2 h-2 rounded-full animate-pulse`, item.dot)} />
                          )}
                        </div>
                        <p className="font-medium text-gray-700 text-sm mt-0.5">{item.title}</p>
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">{item.desc}</p>
                      </div>

                      <div className={cn(
                        "mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
                        formData.jenis_dokumen === item.id ? "text-inherit" : "text-gray-400"
                      )}>
                        Kurikulum Merdeka
                      </div>
                    </div>

                    {/* Selection Indicator Overlay */}
                    {formData.jenis_dokumen === item.id && (
                      <div className={cn(`absolute bottom-0 left-0 right-0 h-1`, item.indicator)} />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-12 flex flex-col items-center gap-4">
                <button 
                  onClick={generateDocument}
                  disabled={isLoading}
                  className="w-full max-w-sm bg-[#0056D2] text-white py-4 rounded-2xl font-bold shadow-xl hover:shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Zap className="w-6 h-6" /> Hasilkan Dokumen AI</>}
                </button>
                <p className="text-xs text-gray-400">Proses ini memakan waktu sekitar 10-20 detik</p>
              </div>
            </motion.div>
          )}

          {activeTab === 'preview' && (
            <motion.div 
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-5xl mx-auto"
            >
              <div className="flex justify-between items-center mb-6 sticky top-20 z-40 bg-[#F8F9FA]/80 backdrop-blur-md py-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Pratinjau Dokumen</h2>
                  <p className="text-xs text-gray-500">Tampilan standar A4 Google Docs</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActiveTab('administrasi')}
                    className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold hover:bg-gray-50 transition-all"
                  >
                    Edit Data
                  </button>
                  <button 
                    onClick={downloadPDF}
                    disabled={isDownloading || !result}
                    className="px-6 py-2 rounded-xl bg-green-600 text-white text-sm font-bold shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"
                  >
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4" /> Download PDF</>}
                  </button>
                </div>
              </div>

              {result ? (
                <div className="bg-white shadow-2xl border border-gray-200 mx-auto p-12 min-h-[1123px] w-full max-w-[800px] font-serif text-[#1A1A1A] leading-relaxed" ref={previewRef}>
                  {/* Header / Kop */}
                  <div className="text-center border-b-2 border-black pb-4 mb-8">
                    <h2 className="text-xl font-bold uppercase m-0 leading-tight">{formData.jenis_dokumen}</h2>
                    <p className="text-sm m-0 mt-1 font-sans">{formData.nama_sekolah}</p>
                    <p className="text-xs italic m-0 font-sans">Tahun Pelajaran {new Date().getFullYear()}/{new Date().getFullYear() + 1}</p>
                  </div>

                  {/* Identity Table */}
                  <div className="mb-8 p-4 border border-black rounded-sm">
                    <table className="w-full text-xs border-none">
                      <tbody>
                        <tr>
                          <td className="w-32 py-0.5 font-bold uppercase">Satuan Pendidikan</td>
                          <td className="w-4 py-0.5">:</td>
                          <td className="py-0.5">{formData.nama_sekolah}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 font-bold uppercase">Mata Pelajaran</td>
                          <td className="py-0.5">:</td>
                          <td className="py-0.5">{formData.mapel}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 font-bold uppercase">Kelas / Semester</td>
                          <td className="py-0.5">:</td>
                          <td className="py-0.5">{formData.kelas} / {formData.semester}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 font-bold uppercase">Tahun Pelajaran</td>
                          <td className="py-0.5">:</td>
                          <td className="py-0.5">{formData.tahun_pelajaran}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 font-bold uppercase">Nama Guru</td>
                          <td className="py-0.5">:</td>
                          <td className="py-0.5">{formData.nama_guru}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 font-bold uppercase">NIP</td>
                          <td className="py-0.5">:</td>
                          <td className="py-0.5">{formData.nip_guru}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Main Content */}
                  <div className="markdown-body mb-12 text-justify max-w-none">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>

                  {/* Signature Section */}
                  <div className="grid grid-cols-2 gap-8 mt-16 text-sm">
                    <div className="text-center">
                      <p className="m-0">Mengetahui,</p>
                      <p className="m-0 mb-20">Kepala Sekolah</p>
                      <p className="m-0 font-bold underline">{formData.nama_kepsek || '................................'}</p>
                      <p className="m-0">NIP. {formData.nip_kepsek || '................................'}</p>
                    </div>
                    <div className="text-center">
                      <p className="m-0">{formData.tempat || '................'}, {formData.tanggal}</p>
                      <p className="m-0 mb-20">Guru Mata Pelajaran</p>
                      <p className="m-0 font-bold underline">{formData.nama_guru || '................................'}</p>
                      <p className="m-0">NIP. {formData.nip_guru || '................................'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-96 flex flex-col items-center justify-center text-center bg-white rounded-2xl border-2 border-dashed border-gray-200">
                  <FileText className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">Belum ada dokumen untuk dipratinjau.<br/>Silakan hasilkan dokumen di tab Administrasi.</p>
                </div>
              )}
            </motion.div>
          )}
          {activeTab === 'admin' && (user?.role === 'admin' || user?.email === 'barlimahardikasandy@gmail.com') && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Dashboard Admin</h2>
                  <p className="text-gray-500">Kelola pengguna dan sistem AdminGuru Pro</p>
                </div>
                <button 
                  onClick={fetchAllUsers}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  <RotateCcw className="w-4 h-4" /> Refresh Data
                </button>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total User</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{allUsers.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">User Aktif</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{allUsers.filter(u => u.isActivated).length}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                    <Zap className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">User Premium</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{allUsers.filter(u => u.package === 'Premium').length}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                    <FileText className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Download</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">
                    {allUsers.reduce((acc, u) => acc + (u.package === 'Premium' ? 999 : 30 - u.downloadsLeft), 0)}
                  </h3>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="font-bold text-gray-900">Daftar Pengguna</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Cari email atau nama..."
                      className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all w-full sm:w-64"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Informasi User</th>
                        <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Paket & Kuota</th>
                        <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status Akun</th>
                        <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {allUsers.map((u) => (
                        <tr key={u.email} className="hover:bg-gray-50/50 transition-all">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                                {(u.namaGelar || u.email).charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-sm text-gray-900">{u.namaGelar || 'User Baru'}</span>
                                <span className="text-xs text-gray-500">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-2">
                              <select 
                                value={u.package} 
                                onChange={(e) => handleUpdateUser(u.email, e.target.value as PackageType, u.downloadsLeft)}
                                className={cn(
                                  "text-[10px] font-bold px-2 py-1 rounded-lg border outline-none transition-all w-fit",
                                  u.package === 'Premium' ? "border-amber-200 bg-amber-50 text-amber-700" : "border-blue-200 bg-blue-50 text-blue-700"
                                )}
                              >
                                <option value="Basic">Basic</option>
                                <option value="Premium">Premium</option>
                              </select>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Sisa:</span>
                                <input 
                                  type="number" 
                                  value={u.downloadsLeft} 
                                  onChange={(e) => handleUpdateUser(u.email, u.package, parseInt(e.target.value))}
                                  className="w-16 text-xs font-bold px-2 py-0.5 rounded-md border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-1 rounded-full w-fit",
                                u.isActivated ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              )}>
                                {u.isActivated ? 'Terverifikasi' : 'Pending'}
                              </span>
                              {u.activationCode && !u.isActivated && (
                                <span className="text-[10px] text-gray-400 font-mono">Code: {u.activationCode}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => {
                                  if (window.confirm(`Reset password untuk ${u.email}?`)) {
                                    // Reset logic
                                  }
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Reset Password"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button 
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Hapus User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-200 mt-12 text-center">
        <p className="text-sm text-gray-400">
          &copy; {new Date().getFullYear()} AdminGuru Pro. Dibuat untuk mendukung pendidikan di Indonesia.
        </p>
      </footer>
    </div>
  </div>
);
}
