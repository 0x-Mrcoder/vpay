import React, { useState } from 'react';
import { 
    Mail, 
    MapPin, 
    Phone, 
    ArrowRight, 
    CheckCircle
} from 'lucide-react';
import { Navbar } from '../../components/public/Navbar';
import { Footer } from '../../components/public/Footer';

export const Contact: React.FC = () => {
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitted(true);
        // Reset after 3 seconds
        setTimeout(() => setIsSubmitted(false), 3000);
    };

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
                        Get in <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-700">Touch</span>
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                        Have questions about VTStack? Our team is here to help you scale your small business with premium payment infrastructure.
                    </p>
                </div>
            </header>

            {/* Contact Grid */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-start">
                        
                        {/* Contact Info */}
                        <div className="space-y-12">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 mb-6">Contact Information</h2>
                                <p className="text-gray-600 leading-relaxed mb-8">
                                    We value your feedback and inquiries. Reach out to us through any of our channels and we'll get back to you as soon as possible.
                                </p>
                            </div>

                            <div className="space-y-8">
                                <div className="flex items-start gap-4 group">
                                    <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-500 group-hover:text-white transition-all duration-300 shadow-sm">
                                        <Mail size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">Email Us</h4>
                                        <a href="mailto:vtstackltdng@gmail.com" className="text-gray-600 hover:text-primary-600 transition-colors">vtstackltdng@gmail.com</a>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 group">
                                    <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-500 group-hover:text-white transition-all duration-300 shadow-sm">
                                        <Phone size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">WhatsApp / Call</h4>
                                        <p className="text-gray-600">+234 707 024 9434</p>
                                        <p className="text-gray-500 text-sm">Mon - Fri, 9am - 6pm</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 group">
                                    <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-500 group-hover:text-white transition-all duration-300 shadow-sm">
                                        <MapPin size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">Office</h4>
                                        <p className="text-gray-600">Lagos, Nigeria</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            
                            <h3 className="text-2xl font-bold text-gray-900 mb-8">Send us a Message</h3>
                            
                            {isSubmitted ? (
                                <div className="text-center py-12 animate-fade-in">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle size={32} />
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h4>
                                    <p className="text-gray-600">We'll get back to you shortly.</p>
                                </div>
                            ) : (
                                <form className="space-y-6" onSubmit={handleSubmit}>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                                            <input 
                                                type="text" 
                                                required
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" 
                                                placeholder="John Doe" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                                            <input 
                                                type="email" 
                                                required
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" 
                                                placeholder="john@example.com" 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
                                        <input 
                                            type="text" 
                                            required
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" 
                                            placeholder="How can we help?" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
                                        <textarea 
                                            rows={5} 
                                            required
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none" 
                                            placeholder="Tell us more about your needs..."
                                        ></textarea>
                                    </div>
                                    <button 
                                        type="submit" 
                                        className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-xl shadow-gray-900/20 hover:shadow-gray-900/30 transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 group"
                                    >
                                        Send Message <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </form>
                            )}
                        </div>

                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};
