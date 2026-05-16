import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bus as BusIcon, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { loginWithGoogle, loginWithMicrosoft, loginWithEmail, registerWithEmail } from '../services/firebase';

const LoginView: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name) throw new Error('Por favor, informe seu nome.');
        await registerWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') setError('Usuário não encontrado.');
      else if (err.code === 'auth/wrong-password') setError('Senha incorreta.');
      else if (err.code === 'auth/email-already-in-use') setError('Este e-mail já está em uso.');
      else if (err.code === 'auth/invalid-email') setError('E-mail inválido.');
      else if (err.code === 'auth/weak-password') setError('A senha deve ter pelo menos 6 caracteres.');
      else setError('Ocorreu um erro ao processar sua solicitação.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'microsoft') => {
    setError('');
    setLoading(true);
    try {
      if (provider === 'google') await loginWithGoogle();
      else await loginWithMicrosoft();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        setError('O popup de login foi bloqueado pelo navegador.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('O login foi cancelado.');
      } else {
        setError('Erro ao conectar com provedor externo. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center p-4">
      {/* Background shape for depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[40%] h-[40%] bg-slate-200 rounded-full blur-3xl opacity-30" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[440px] bg-white p-11 shadow-[0_2px_4px_rgba(0,0,0,0.1),0_12px_28px_rgba(0,0,0,0.1)] relative z-10"
      >
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-slate-900 flex items-center justify-center text-white rounded-sm">
              <BusIcon size={18} />
            </div>
            <span className="font-bold text-slate-900 tracking-tighter uppercase text-base leading-tight">Coordenação de Transporte</span>
          </div>
          
          <h1 className="text-2xl font-semibold text-[#1b1b1b] mb-1">
            {isRegister ? 'Criar conta' : 'Entrar'}
          </h1>
          <p className="text-sm text-[#1b1b1b]">
            {isRegister ? 'Crie sua conta para começar.' : 'Acesse para continuar agora.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {isRegister && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-1"
              >
                <input
                  required={isRegister}
                  type="text"
                  placeholder="Nome completo"
                  className="w-full px-0 py-2.5 bg-transparent border-b-2 border-slate-900 outline-none text-sm text-[#1b1b1b] focus:border-[#0067b8] transition-all placeholder:text-slate-400"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1">
            <input
              required
              type="email"
              placeholder="E-mail ou telefone"
              className="w-full px-0 py-2.5 bg-transparent border-b-2 border-slate-900 outline-none text-sm text-[#1b1b1b] focus:border-[#0067b8] transition-all placeholder:text-slate-400"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <input
              required
              type="password"
              placeholder="Senha"
              className="w-full px-0 py-2.5 bg-transparent border-b-2 border-slate-900 outline-none text-sm text-[#1b1b1b] focus:border-[#0067b8] transition-all placeholder:text-slate-400"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div className="pt-2 text-xs text-slate-500">
            {isRegister ? (
              <p>Ao criar uma conta, você concorda com nossos termos.</p>
            ) : (
              <button 
                type="button"
                onClick={() => setIsRegister(true)}
                className="text-[#0067b8] hover:underline"
              >
                Não tem uma conta? Crie uma!
              </button>
            )}
          </div>

          {error && (
            <p className="text-[11px] text-rose-600 font-medium">{error}</p>
          )}

          <div className="flex justify-end pt-6 gap-3">
            {isRegister && (
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="px-8 py-2 bg-[#cccccc] text-[#1b1b1b] text-sm font-semibold hover:bg-[#b3b3b3] transition-all"
              >
                Voltar
              </button>
            )}
            <button
              disabled={loading}
              type="submit"
              className="px-8 py-2 bg-[#0067b8] text-white text-sm font-semibold hover:bg-[#005da6] transition-all disabled:opacity-50"
            >
              {loading ? (isRegister ? 'Criando...' : 'Entrando...') : (isRegister ? 'Criar' : 'Próximo')}
            </button>
          </div>
        </form>

        <div className="mt-12">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-4 text-slate-400 uppercase tracking-widest font-bold text-[9px]">Opções de entrada</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button
              disabled={loading}
              onClick={() => handleSocialLogin('google')}
              className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium flex items-center justify-center gap-3 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              {loading ? 'Processando...' : 'Entrar com o Google'}
            </button>
            
            <button
              disabled={loading}
              onClick={() => handleSocialLogin('microsoft')}
              className="w-full py-2.5 bg-[#2f2f2f] text-white text-sm font-medium flex items-center justify-center gap-3 hover:bg-black transition-all disabled:opacity-50"
            >
              <img src="https://www.microsoft.com/favicon.ico" alt="Microsoft" className="w-4 h-4 invert" />
              {loading ? 'Processando...' : 'Entrar com a Microsoft'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginView;
