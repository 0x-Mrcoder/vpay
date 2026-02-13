import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import '../../styles/landing.css';
import vtpayLogo from '../../assets/logo.png';

export const Contact: React.FC = () => {
    return (
        <div className="landing-page">
            {/* Navigation */}
            <nav className="landing-nav scrolled">
                <div className="landing-nav-container">
                    <div className="landing-nav-content">
                        <Link to="/" className="landing-logo">
                            <img src={vtpayLogo} alt="VTStack" className="h-10 w-auto" />
                        </Link>
                        <div className="landing-nav-links">
                            <Link to="/about" className="landing-nav-link">About Us</Link>
                            <Link to="/contact" className="landing-nav-link" style={{ color: '#16A34A' }}>Contact Us</Link>
                            <Link to="/login" className="landing-btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Login</Link>
                            <Link to="/register" className="landing-btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Get Started</Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Header */}
            <header className="landing-hero" style={{ paddingBottom: '60px', paddingTop: '150px' }}>
                <div className="landing-hero-bg">
                    <div className="landing-hero-gradient landing-hero-gradient-1"></div>
                    <div className="landing-hero-gradient landing-hero-gradient-2"></div>
                </div>

                <div className="landing-container relative z-10 text-center">
                    <h1 className="landing-section-title">Get in Touch</h1>
                    <p className="landing-section-subtitle">
                        Have questions about VTStack? Our team is here to help you scale your VTU business.
                    </p>
                </div>
            </header>

            {/* Contact Content */}
            <section className="landing-features" style={{ paddingTop: '0' }}>
                <div className="landing-container">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">

                        {/* Contact Info */}
                        <div className="landing-feature-card">
                            <h3 className="landing-feature-title mb-6">Contact Information</h3>

                            <div className="flex items-start gap-4 mb-6">
                                <div className="p-3 bg-green-50 rounded-lg text-green-600">
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Email Us</h4>
                                    <p className="text-gray-500">support@vtstack.com.ng</p>
                                    <p className="text-gray-500">sales@vtstack.com.ng</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 mb-6">
                                <div className="p-3 bg-green-50 rounded-lg text-green-600">
                                    <Phone size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Call Us</h4>
                                    <p className="text-gray-500">+234 800 VTSTACK HELP</p>
                                    <p className="text-gray-500">Mon - Fri, 9am - 6pm</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-green-50 rounded-lg text-green-600">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Visit Us</h4>
                                    <p className="text-gray-500">123 Innovation Drive</p>
                                    <p className="text-gray-500">Lagos, Nigeria</p>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form Placeholder */}
                        <div className="landing-feature-card">
                            <h3 className="landing-feature-title mb-6">Send us a Message</h3>
                            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all" placeholder="John Doe" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all" placeholder="john@example.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                    <textarea rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all" placeholder="How can we help you?"></textarea>
                                </div>
                                <button type="submit" className="landing-btn-primary w-full justify-center">
                                    Send Message
                                </button>
                            </form>
                        </div>

                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
                <div className="landing-container">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="landing-footer-logo">
                            <img src={vtpayLogo} alt="VTStack Logo" style={{ height: '40px' }} />
                        </div>
                        <p className="text-gray-400 text-sm">© {new Date().getFullYear()} VTStack Inc. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
