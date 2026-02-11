import React from 'react';
import { Link } from 'react-router-dom';
import { Target, Shield, Zap } from 'lucide-react';
import '../../styles/landing.css';
import vtpayLogo from '../../assets/images/vtpay-logo.svg';

export const About: React.FC = () => {
    return (
        <div className="landing-page">
            {/* Navigation */}
            <nav className="landing-nav scrolled">
                <div className="landing-nav-container">
                    <div className="landing-nav-content">
                        <Link to="/" className="landing-logo">
                            <img src={vtpayLogo} alt="VTPay" className="h-10 w-auto" />
                        </Link>
                        <div className="landing-nav-links">
                            <Link to="/about" className="landing-nav-link" style={{ color: '#16A34A' }}>About Us</Link>
                            <Link to="/contact" className="landing-nav-link">Contact Us</Link>
                            <Link to="/login" className="landing-btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Login</Link>
                            <Link to="/register" className="landing-btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Get Started</Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <header className="landing-hero" style={{ paddingBottom: '60px', paddingTop: '150px' }}>
                <div className="landing-hero-bg">
                    <div className="landing-hero-gradient landing-hero-gradient-3"></div>
                </div>

                <div className="landing-container relative z-10 text-center">
                    <h1 className="landing-section-title">Empowering VTU Businesses</h1>
                    <p className="landing-section-subtitle">
                        VTPay is the dedicated payment infrastructure built specifically for the Virtual Top-Up industry.
                    </p>
                </div>
            </header>

            {/* Mission Section */}
            <section className="landing-features" style={{ paddingTop: '0' }}>
                <div className="landing-container">
                    <div className="max-w-4xl mx-auto text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
                        <p className="text-lg text-gray-600 leading-relaxed">
                            To provide a seamless, reliable, and secure payment experience that enables VTU platforms
                            and data resellers to scale without limits. We believe that payment infrastructure
                            should be an enabler, not a bottleneck.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="landing-feature-card text-center">
                            <div className="landing-feature-icon landing-icon-green mx-auto">
                                <Target />
                            </div>
                            <h3 className="landing-feature-title">Focused</h3>
                            <p className="landing-feature-description">
                                Unlike generic gateways, we are 100% focused on the unique needs of the VTU market.
                            </p>
                        </div>
                        <div className="landing-feature-card text-center">
                            <div className="landing-feature-icon landing-icon-blue mx-auto">
                                <Shield />
                            </div>
                            <h3 className="landing-feature-title">Secure</h3>
                            <p className="landing-feature-description">
                                Enterprise-grade security protocols to protect your business and your customers' funds.
                            </p>
                        </div>
                        <div className="landing-feature-card text-center">
                            <div className="landing-feature-icon landing-icon-purple mx-auto">
                                <Zap />
                            </div>
                            <h3 className="landing-feature-title">Reliable</h3>
                            <p className="landing-feature-description">
                                99.9% uptime guarantee ensuring your platform is always ready to process transactions.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Powered By Section */}
            <section className="py-20 bg-white">
                <div className="landing-container text-center">
                    <p className="text-sm font-bold text-green-600 uppercase tracking-widest mb-4">Our Heritage</p>
                    <h2 className="text-3xl font-bold text-gray-900 mb-8">Powered by VTFree</h2>
                    <p className="max-w-2xl mx-auto text-gray-600 mb-8">
                        VTPay is built and maintained by the engineering team at VTFree, bringing years of
                        telecommunications and fintech expertise to your doorstep.
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
                <div className="landing-container">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="landing-footer-logo">
                            <img src={vtpayLogo} alt="VTPay Logo" style={{ height: '40px' }} />
                        </div>
                        <p className="text-gray-400 text-sm">© {new Date().getFullYear()} VTPay Inc. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
