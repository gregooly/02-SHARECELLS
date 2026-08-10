'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';

// Navigation menu items configuration
const menuItems = [
  {
    id: 'worksheet',
    label: 'WorkSheets',
    path: '/admin',
    icon: '/svg/worksheet.svg',
  },
  {
    id: 'apikey',
    label: 'API Key',
    path: '/admin/apikey',
    icon: '/svg/key.svg',
  },
  {
    id: 'users',
    label: 'Users',
    path: '/admin/users',
    icon: '/svg/users.svg',
  },
  
  
  // Add more menu items here in the future
  // {
  //   id: 'settings',
  //   label: 'Settings',
  //   path: '/admin/settings',
  //   icon: '/svg/settings.svg',
  // },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start collapsed
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    // Check screen size and set initial sidebar state
    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    
    // Set initial state
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Verify authentication and role
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    const userData = localStorage.getItem('user');

    if (!token || userRole !== 'admin') {
      router.push('/?error=unauthorized');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    showToast('info', 'Logged Out', 'You have been successfully logged out.');
    setTimeout(() => {
      router.push('/');
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <img 
            src="/svg/6-dots-spinner.svg" 
            alt="Loading..." 
            className="w-16 h-16 mx-auto"
          />
          <p className="mt-4" style={{ color: 'var(--neutral-600)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Left Sidebar */}
      <aside className={`
        shadow-lg transition-all duration-300 flex-shrink-0 overflow-hidden
        md:relative inset-y-0 left-0 z-50
        ${sidebarOpen ? 'w-64 fixed' : 'w-16 relative'}
      `} style={{ background: 'var(--sidebar-bg)' }}>
        <div className="h-full overflow-y-auto">
          {/* Logo Section */}
          <div className="h-18 flex items-center justify-center" style={{ 
            background: 'var(--primary-yellow)',
            borderBottom: '2px solid var(--primary-yellow-dark)'
          }}>
            <img 
              src={sidebarOpen ? "/sharecells-logo.png" : "/sharecells-square.png"}
              alt="ShareCells Logo" 
              className="w-auto transition-all duration-300 h-16"
              style={{ background: 'var(--primary-yellow)' }}
            />
          </div>

          {/* Navigation Menu */}
          <nav className={`${sidebarOpen ? 'p-4' : 'p-2'}`}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center mb-2 rounded-full transition-all duration-200 ${
                sidebarOpen ? 'px-4 py-1.5 justify-start' : 'px-2 py-3 justify-center'
              }`}
              style={pathname === item.path ? {
                background: 'linear-gradient(135deg, var(--primary-yellow-lighter), var(--primary-yellow-light))',
                color: 'var(--neutral-900)',
                border: '1px solid var(--primary-yellow)',
                boxShadow: 'var(--shadow-sm)'
              } : {
                color: 'var(--neutral-700)',
                border: '1px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (pathname !== item.path) {
                  e.currentTarget.style.background = 'var(--primary-yellow-lighter)';
                  e.currentTarget.style.border = '1px solid var(--primary-yellow-light)';
                }
              }}
              onMouseLeave={(e) => {
                if (pathname !== item.path) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.border = '1px solid transparent';
                }
              }}
              title={!sidebarOpen ? item.label : ''}
            >
              <img 
                src={item.icon} 
                alt={item.label}
                className={`flex-shrink-0 transition-all duration-300 ${
                  sidebarOpen ? 'w-5 h-5 mr-3' : 'w-5 h-5'
                }`}
              />
              {sidebarOpen && <span className="text-md">{item.label}</span>}
            </button>
          ))}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="shadow-sm h-18 flex-shrink-0" style={{ 
          background: 'var(--primary-yellow)',
          borderBottom: '2px solid var(--primary-yellow-dark)'
        }}>
          <div className="h-full px-6 flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg transition-all duration-200"
                style={{ color: 'var(--neutral-800)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                aria-label="Toggle Sidebar"
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 6h16M4 12h16M4 18h16" 
                  />
                </svg>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 px-2 py-0.5 rounded-full transition-all duration-200"
                  style={{ color: 'var(--neutral-900)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div className="w-9 h-9 rounded-fullflex items-center justify-center">
                    <img 
                        src='/svg/user-default.svg'
                        alt='user-icon'
                        className="w-9 h-9 opacity-80"
                    />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--neutral-900)' }}>Admin</span>
                  <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} 
                       fill="none" stroke="currentColor" viewBox="0 0 24 24"
                       style={{ color: 'var(--neutral-800)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-2 z-20" 
                         style={{ 
                           background: 'var(--card-bg)',
                           border: '1px solid var(--card-border)',
                           boxShadow: 'var(--shadow-md)'
                         }}>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full px-4 py-2 text-left text-sm flex items-center space-x-2 transition-colors"
                        style={{ color: 'var(--neutral-700)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--neutral-100)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <img 
                            src='/svg/logout.svg'
                            alt='user-icon'
                            className="w-6 h-6 mr-3 opacity-60"
                        />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Children will be rendered here */}
        <main className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--sidebar-bg)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
