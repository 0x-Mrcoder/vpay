import React from 'react';
import { Navbar } from '../../components/public/Navbar';
import { Footer } from '../../components/public/Footer';
import { CheckCircle, AlertTriangle, Clock, Zap } from 'lucide-react';

export const Status: React.FC = () => {
    const systems = [
        { name: 'API Services', status: 'operational', uptime: '99.99%' },
        { name: 'Virtual Account Engine', status: 'operational', uptime: '99.95%' },
        { name: 'Webhook Deliveries', status: 'operational', uptime: '100%' },
        { name: 'Dashboard Access', status: 'operational', uptime: '99.98%' },
        { name: 'Email Notifications', status: 'operational', uptime: '99.90%' },
    ];

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-primary-100 selection:text-primary-900">
            <Navbar />
            
            <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-gray-900 border-b border-gray-800">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3"></div>
                </div>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-bold text-xs uppercase tracking-wider mb-8">
                        <CheckCircle size={14} />
                        All Systems Operational
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-tight">System Status</h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        Real-time status updates for all VTStack core services and infrastructure.
                    </p>
                </div>
            </header>

            <main className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                    <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">Core Services</h2>
                        <span className="text-sm font-medium text-gray-500">Updated: Dec 20, 2025</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {systems.map((system, idx) => (
                            <div key={idx} className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                                        <Zap size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{system.name}</h3>
                                        <p className="text-xs text-gray-500 font-medium">Uptime: {system.uptime}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    <span className="text-sm font-bold text-green-600 uppercase tracking-wide">Operational</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-16 grid md:grid-cols-2 gap-8">
                    <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Clock size={18} className="text-primary-600" />
                            Incident History
                        </h4>
                        <p className="text-sm text-gray-600">No major incidents reported in the last 30 days.</p>
                    </div>
                    <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <AlertTriangle size={18} className="text-amber-500" />
                            Planned Maintenance
                        </h4>
                        <p className="text-sm text-gray-600">No maintenance scheduled for the upcoming 72 hours.</p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};
