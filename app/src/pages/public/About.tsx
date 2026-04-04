import React from 'react';
import {
    Shield,
    Zap,
    Target,
    ArrowRight
} from 'lucide-react';
import { Navbar } from '../../components/public/Navbar';
import { Footer } from '../../components/public/Footer';

export const About: React.FC = () => {
    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-primary-100 selection:text-primary-900">
            <Navbar />

            {/* Hero Section */}
            <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-gray-50">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-100/40 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary-50/60 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <h1 className="text-5xl lg:text-7xl font-black text-gray-900 mb-6 leading-tight tracking-tight">
                        Empowering <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-700">Small Businesses</span>
                    </h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                        VTStack is Nigeria's most reliable payment infrastructure built specifically for the Virtual Top-Up industry and modern digital entrepreneurs.
                    </p>
                </div>
            </header>

            {/* Mission Section */}
            <section className="py-24 bg-white relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
                        <p className="text-lg text-gray-600 leading-relaxed">
                            To provide a seamless, reliable, and secure payment experience that enables modern platforms 
                            and data resellers to scale without limits. We believe that payment infrastructure 
                            should be an enabler, not a bottleneck.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300 border border-gray-100 group text-center">
                            <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 mb-6 mx-auto group-hover:bg-primary-500 group-hover:text-white transition-colors duration-300">
                                <Target size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Focused</h3>
                            <p className="text-gray-600 leading-relaxed text-sm">
                                Unlike generic gateways, we are 100% focused on the unique needs of the digital top-up market.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300 border border-gray-100 group text-center">
                            <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 mb-6 mx-auto group-hover:bg-primary-500 group-hover:text-white transition-colors duration-300">
                                <Shield size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Secure</h3>
                            <p className="text-gray-600 leading-relaxed text-sm">
                                Enterprise-grade security protocols to protect your business and your customers' funds.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300 border border-gray-100 group text-center">
                            <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 mb-6 mx-auto group-hover:bg-primary-500 group-hover:text-white transition-colors duration-300">
                                <Zap size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Reliable</h3>
                            <p className="text-gray-600 leading-relaxed text-sm">
                                99.9% uptime guarantee ensuring your platform is always ready to process transactions.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Heritage Section */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <span className="text-primary-600 font-bold tracking-wider uppercase text-sm">Our Heritage</span>
                    <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-8">Powered by VTFree</h2>
                    <p className="max-w-2xl mx-auto text-gray-600 mb-8 leading-relaxed">
                        VTStack is built and maintained by the engineering team at VTFree, bringing years of 
                        telecommunications and fintech expertise to your doorstep.
                    </p>
                    <a href="https://vtfree.com.ng/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary-600 font-bold hover:text-primary-700 transition-colors group">
                        Visit VTFree <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </a>
                </div>
            </section>

            <Footer />
        </div>
    );
};
