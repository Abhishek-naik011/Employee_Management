import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Mail, Lock, ChevronRight, Shield } from 'lucide-react';
import { usePermission } from '../context/PermissionContext';

const Login = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const { user, loadUser, loading } = usePermission();

  useEffect(() => {
    if (user) {
      navigate(user.role_name === 'Admin' ? '/dashboard' : '/employee-dashboard', { replace: true });
    }
  }, [user, navigate]);

  if (loading) return null;

  const onSubmit = async (data) => {
    try {
      const response = await fetch(`\${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (result.success) {
        if (result.requirePasswordChange) {
          localStorage.setItem('tempToken', result.token);
          toast.success('First login detected. Please change your password.');
          navigate('/change-password', { replace: true });
        } else {
          await loadUser(); // Fetch user from newly set cookie
          toast.success('Successfully logged in!');
          navigate(result.user.role_name === 'Admin' ? '/dashboard' : '/employee-dashboard', { replace: true });
        }
      } else {
        toast.error(result.message || 'Invalid credentials');
      }
    } catch (err) {
      toast.error('Server error. Please try again later.');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Centered Login Form */}
      <div className="w-full flex items-center justify-center p-8 relative">
        {/* Decorative background blobs */}
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="bg-white/80 backdrop-blur-xl border border-white/40 p-8 rounded-3xl shadow-xl shadow-gray-200/50">
            <div className="mb-10 text-center">
              <h3 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h3>
              <p className="text-gray-500">Please enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    {...register("email", { 
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address"
                      }
                    })}
                    className={`block w-full pl-11 pr-4 py-3 bg-white/50 border ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'} rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                    placeholder="admin@company.com"
                  />
                </div>
                {errors.email && <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500"></span>{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    {...register("password", { required: "Password is required" })}
                    className={`block w-full pl-11 pr-4 py-3 bg-white/50 border ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'} rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500"></span>{errors.password.message}</p>}
              </div>



              <button
                type="submit"
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-md shadow-blue-200 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98]"
              >
                <span>Login</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
            
            <div className="mt-8 text-center text-xs text-gray-400 lg:hidden">
              &copy; {new Date().getFullYear()} EmpManage Inc.
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
