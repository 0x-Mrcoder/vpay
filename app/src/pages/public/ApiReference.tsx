import React from 'react';
import { Navbar } from '../../components/public/Navbar';
import { Footer } from '../../components/public/Footer';
import { Terminal, Zap, ArrowRight, Shield, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ApiReference: React.FC = () => {
    const endpoints = [
        { method: 'POST', path: '/virtual-accounts', desc: 'Create a new dedicated virtual account.' },
        { method: 'GET', path: '/virtual-accounts', desc: 'List all virtual accounts under your account.' },
        { method: 'GET', path: '/virtual-accounts/:acc/balance', desc: 'Fetch the real-time balance of an account.' },
        { method: 'POST', path: '/payouts', desc: 'Initiate a transfer from your wallet.' },
    ];

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-primary-100 selection:text-primary-900">
            <Navbar />
            
            <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-gray-950 border-b border-gray-800">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
                </div>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <h1 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-tight">API Reference</h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        A quick overview of our most powerful endpoints. For full integration details, visit our complete documentation.
                    </p>
                    <div className="mt-10 flex justify-center gap-4">
                        <Link to="/api-docs" className="px-8 py-4 bg-primary-600 text-white font-bold rounded-2xl shadow-xl shadow-primary-500/20 hover:shadow-primary-500/30 transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 group">
                            Full Documentation <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </header>

            <main className="py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-12 mb-20">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black text-gray-900">RESTful Core</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Our API is built on REST principles, returning JSON-encoded responses and using standard HTTP response codes, authentication, and verbs.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl text-sm font-bold text-gray-700 border border-gray-200">
                                <Shield size={16} className="text-primary-600" /> API Keys
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl text-sm font-bold text-gray-700 border border-gray-200">
                                <Zap size={16} className="text-primary-600" /> Instant Settlement
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl text-sm font-bold text-gray-700 border border-gray-200">
                                <Bell size={16} className="text-primary-600" /> Webhooks
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-950 rounded-3xl p-8 border border-gray-800 shadow-2xl font-mono text-sm">
                        <div className="flex items-center gap-2 mb-6 text-gray-500 text-xs uppercase tracking-widest font-bold">
                            <Terminal size={14} /> Quick Auth Sample
                        </div>
                        <div className="space-y-2">
                            <div className="text-purple-400">curl <span className="text-blue-400">-X</span> GET</div>
                            <div className="pl-4 text-orange-300">"https://api.vtstack.com.ng/v1/virtual-accounts"</div>
                            <div className="text-purple-400"><span className="text-blue-400">-H</span> <span className="text-orange-300">"x-api-key: sk_live_xxxx"</span></div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-2xl font-black text-gray-900 mb-8">Popular Endpoints</h2>
                    <div className="grid gap-6">
                        {endpoints.map((ep, idx) => (
                            <div key={idx} className="bg-white border border-gray-100 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-500/5 transition-all group">
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-black font-mono ${ep.method === 'POST' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                                        {ep.method}
                                    </span>
                                    <div>
                                        <h4 className="font-bold text-gray-900 font-mono text-sm">{ep.path}</h4>
                                        <p className="text-sm text-gray-500 mt-1">{ep.desc}</p>
                                    </div>
                                </div>
                                <Link to="/api-docs" className="text-primary-600 hover:text-primary-700 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-sm">
                                    Docs <ChevronRight size={16} />
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );

    function ChevronRight({ size }: { size: number }) {
        return <ArrowRight size={size} />;
    }
};
