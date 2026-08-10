'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';
import Spinner from '@/components/ui/Spinner';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'agent'>('agent');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    confirmPassword: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [hasShownError, setHasShownError] = useState(false);

  // Clear invalid tokens on mount
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'invalid_token') {
      // Clear localStorage and cookies for invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
  }, []);

  useEffect(() => {
    // Prevent showing toasts multiple times
    if (hasShownError) return;

    if (searchParams.get('registered') === 'true') {
      showToast('success', 'Account Created!', 'Your account has been created successfully! Please sign in.');
      setIsLogin(true);
      setHasShownError(true);
      // Clear the URL parameter
      router.replace('/');
      return;
    }
    
    // Handle error messages from middleware
    const errorParam = searchParams.get('error');
    if (errorParam) {
      if (errorParam === 'unauthorized') {
        showToast('warning', 'Authentication Required', 'You must be logged in to access that page.');
      } else if (errorParam === 'forbidden') {
        showToast('error', 'Access Denied', 'You do not have permission to access that page.');
      } else if (errorParam === 'invalid_token') {
        showToast('warning', 'Session Expired', 'Your session has expired. Please sign in again.');
      }
      setHasShownError(true);
      // Clear the URL parameter
      router.replace('/');
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLoginClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: This allows cookies to be sent and received
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: userRole,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Sign in failed');
      }

      // Store token in localStorage
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userRole', userRole);
        
        // Show success toast
        showToast('success', 'Welcome Back!', `Successfully signed in as ${userRole}.`);

        // Redirect based on role
        const redirectPath = userRole === 'admin' ? '/admin' : '/agent';
        
        // Check if cookies are set before redirecting
        const checkCookiesAndRedirect = () => {
          const cookies = document.cookie;
          const hasToken = cookies.includes('token=');
          const hasRole = cookies.includes('userRole=');

          if (hasToken && hasRole) {
            window.location.href = redirectPath;
          } else {
            // If cookies not set after 3 seconds, try anyway
            window.location.href = redirectPath;
          }
        };
        
        // Wait a bit for cookies to be set, then check and redirect
        setTimeout(checkCookiesAndRedirect, 1500);
      } else {
        throw new Error('No token received');
      }
    } catch (err: any) {
      showToast('error', 'Sign In Failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleRegisterClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      showToast('error', 'Password Mismatch', 'Passwords do not match. Please try again.');
      return;
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      showToast('error', 'Weak Password', 'Password must be at least 8 characters with uppercase, lowercase, and number.');
      return;
    }

    setSubmitLoading(true);

    try {
      // Step 1: Check if admin email exists via server-side API
      const adminCheckResponse = await fetch('/api/verify-admin-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      if (!adminCheckResponse.ok) {
        throw new Error('Failed to verify administrator email');
      }

      const adminData = await adminCheckResponse.json();

      if (!adminData.success || !adminData.exists) {
        showToast('error', 'Email Not Found', 'Administrator email does not exist in PulsePoint system.');
        setSubmitLoading(false);
        return;
      }

      const customerId = adminData.customerId;

      // Step 2: Check if username already exists in local database
      const usernameCheckResponse = await fetch('/api/check-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
        }),
      });

      const usernameCheck = await usernameCheckResponse.json();
      
      if (usernameCheck.exists) {
        showToast('error', 'Username Taken', 'Account already exists with this username. Please choose another.');
        setSubmitLoading(false);
        return;
      }

      // Step 3: Register the new user in local database
      const response = await fetch('/api/register-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminEmail: formData.email,
          username: formData.username,
          password: formData.password,
          customerId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      if (data.success) {
        showToast('success', 'Registration Successful!', 'Account pending approval. Please sign in.');
        setIsLogin(true);
        // Clear form
        setFormData({
          email: '',
          password: '',
          username: '',
          confirmPassword: '',
        });
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (err: any) {
      showToast('error', 'Registration Failed', err.message || 'Failed to register. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
     <div className="min-h-screen flex items-center justify-center p-4" style={{ 
       background: 'linear-gradient(135deg, #fdf0a2ff 0%, #fdf0a2ff 50%, #fdf0a2ff 100%)'
     }}>
      {/* Responsive Login Card */}
      <div className="rounded-lg shadow-2xl overflow-hidden w-full max-w-6xl mx-auto" 
           style={{ 
             background: 'var(--card-bg)',
             boxShadow: 'var(--shadow-lg)'
           }}>
        <div className="flex flex-col xl:flex-row min-h-[500px] xl:min-h-[600px]">
          {/* Image Section - Always visible, responsive positioning */}
          <div className="xl:w-2/5 w-full flex items-center justify-center p-4 xl:p-6" 
               style={{ background: 'var(--primary-yellow)' }}>
            <div className="w-full h-full flex items-center justify-center">
              <img 
                src="/sharecells-logo.png" 
                alt="ShareCells Logo" 
                className="w-full max-w-xs xl:max-w-full h-auto xl:max-h-full object-contain"
              />
            </div>
          </div>

          {/* Form Section */}
          <div className="xl:w-3/5 w-full px-4 sm:px-6 xl:px-8 py-6 xl:py-8 flex flex-col justify-center">
            <div className="max-w-md mx-auto w-full">
              <div className="text-center mb-4 xl:mb-6 relative">
                <h1 className="text-lg sm:text-xl xl:text-2xl font-semibold mb-2" 
                    style={{ color: 'var(--neutral-800)' }}>
                  {isLogin ? 'Sign in to Your Account' : 'Create Your Account'}
                </h1>
                
                {/* Admin/Delegate Toggle Button - Only on Sign In */}
                {isLogin && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex justify-center">
                      <div className="inline-flex items-center gap-2 rounded-full p-1" 
                           style={{ background: 'var(--neutral-100)' }}>
                        <button
                          onClick={() => setUserRole('admin')}
                          className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                          style={userRole === 'admin' ? {
                            background: 'linear-gradient(135deg, var(--primary-yellow), var(--accent-gold))',
                            color: 'var(--neutral-900)',
                            boxShadow: 'var(--shadow-sm)'
                          } : {
                            background: 'transparent',
                            color: 'var(--neutral-600)'
                          }}
                        >
                          Admin
                        </button>
                        <button
                          onClick={() => setUserRole('agent')}
                          className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                          style={userRole === 'agent' ? {
                            background: 'linear-gradient(135deg, var(--primary-yellow), var(--accent-gold))',
                            color: 'var(--neutral-900)',
                            boxShadow: 'var(--shadow-sm)'
                          } : {
                            background: 'transparent',
                            color: 'var(--neutral-600)'
                          }}
                        >
                          Agent
                        </button>
                      </div>
                    </div>
                    {userRole === 'admin' && (
                      <p className="text-xs" style={{ color: 'var(--neutral-600)' }}>
                        You must sign up with a pulsepoint account.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {isLogin ? (
                // Login Form
                <div className="space-y-4 xl:space-y-2">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2"
                           style={{ color: 'var(--neutral-700)' }}>
                      {userRole === 'admin' ? 'Manager Email' : 'Username'}
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full text-sm px-4 py-2 rounded-lg focus:outline-none transition-all duration-200"
                      style={{
                        background: 'var(--input-bg)',
                        border: '1px solid var(--neutral-300)',
                        color: 'var(--neutral-900)'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary-yellow)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(242, 200, 18, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--neutral-300)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      placeholder={userRole === 'admin' ? 'Enter your manager email' : 'Enter your username'}
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-2"
                           style={{ color: 'var(--neutral-700)' }}>
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="w-full text-sm px-4 py-2 rounded-lg focus:outline-none transition-all duration-200"
                      style={{
                        background: 'var(--input-bg)',
                        border: '1px solid var(--neutral-300)',
                        color: 'var(--neutral-900)'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary-yellow)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(242, 200, 18, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--neutral-300)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      placeholder="Enter your password"
                    />
                  </div>
                  <div className='pt-8'>
                       <button
                          onClick={handleLoginClick}
                          disabled={submitLoading}
                          className="w-full font-semibold py-2 px-6 rounded-lg focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                          style={{
                            background: submitLoading ? 'var(--neutral-400)' : 'linear-gradient(135deg, var(--primary-yellow-dark), var(--accent-gold))',
                            color: 'white',
                            boxShadow: 'var(--shadow)'
                          }}
                          onMouseEnter={(e) => {
                            if (!submitLoading) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!submitLoading) {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'var(--shadow)';
                            }
                          }}
                        >
                          {submitLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                  </div>
                 
                </div>
              ) : (
                // Registration Form
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2"
                           style={{ color: 'var(--neutral-700)' }}>
                      Manager Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 rounded-lg focus:outline-none transition-all duration-200 text-sm"
                      style={{
                        background: 'var(--input-bg)',
                        border: '1px solid var(--neutral-300)',
                        color: 'var(--neutral-900)'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary-yellow)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(242, 200, 18, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--neutral-300)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      placeholder="Email address"
                    />
                  </div>

                  <div>
                    <label htmlFor="username" className="block text-sm font-medium mb-2"
                           style={{ color: 'var(--neutral-700)' }}>
                      Username *
                    </label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 rounded-lg focus:outline-none transition-all duration-200 text-sm"
                      style={{
                        background: 'var(--input-bg)',
                        border: '1px solid var(--neutral-300)',
                        color: 'var(--neutral-900)'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary-yellow)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(242, 200, 18, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--neutral-300)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      placeholder="Username"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-2"
                           style={{ color: 'var(--neutral-700)' }}>
                      Password *
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 rounded-lg focus:outline-none transition-all duration-200 text-sm"
                      style={{
                        background: 'var(--input-bg)',
                        border: '1px solid var(--neutral-300)',
                        color: 'var(--neutral-900)'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary-yellow)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(242, 200, 18, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--neutral-300)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      placeholder="Password"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--neutral-500)' }}>
                      Min 8 characters with uppercase, lowercase, and number
                    </p>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2"
                           style={{ color: 'var(--neutral-700)' }}>
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 rounded-lg focus:outline-none transition-all duration-200 text-sm"
                      style={{
                        background: 'var(--input-bg)',
                        border: '1px solid var(--neutral-300)',
                        color: 'var(--neutral-900)'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary-yellow)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(242, 200, 18, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--neutral-300)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      placeholder="Confirm password"
                    />
                  </div>

                  <button
                    onClick={handleRegisterClick}
                    disabled={submitLoading}
                    className="w-full font-semibold py-2 px-6 rounded-lg focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    style={{
                      background: submitLoading ? 'var(--neutral-400)' : 'linear-gradient(135deg, var(--primary-yellow-dark), var(--accent-gold))',
                      color: 'white',
                      boxShadow: 'var(--shadow)'
                    }}
                    onMouseEnter={(e) => {
                      if (!submitLoading) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!submitLoading) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'var(--shadow)';
                      }
                    }}
                  >
                    {submitLoading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </div>
              )}

              <div className="mt-1 ">
                <p className="text-sm" style={{ color: 'var(--neutral-600)' }}>
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button 
                    onClick={() => setIsLogin(!isLogin)}
                    className="font-medium transition-colors duration-200"
                    style={{ color: 'var(--primary-yellow-dark)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--accent-gold)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--primary-yellow-dark)';
                    }}
                  >
                    {isLogin ? 'Register' : 'Sign in here'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ 
        background: 'linear-gradient(135deg, #fff9e6 0%, #fffbf0 50%, #fff5db 100%)'
      }}>
        <div className="text-center">
          <Spinner size={48} />
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}




