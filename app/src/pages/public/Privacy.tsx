import React from 'react';
import { Navbar } from '../../components/public/Navbar';
import { Footer } from '../../components/public/Footer';

export const Privacy: React.FC = () => {
    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-primary-100 selection:text-primary-900">
            <Navbar />
            
            <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-gray-50 border-b border-gray-100">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-100/40 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary-50/60 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3"></div>
                </div>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <h1 className="text-4xl lg:text-5xl font-black text-gray-900 mb-6 tracking-tight">Privacy Policy</h1>
                    <p className="text-lg text-gray-600 font-medium">Last updated: {new Date().toLocaleDateString()}</p>
                </div>
            </header>

            <main className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="prose prose-lg prose-primary max-w-none text-gray-600 space-y-10">
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
                        <p>We collect information you provide directly to us when you create an account, use our services, or communicate with us. This may include your name, email address, phone number, and financial information necessary for virtual account creation.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Information</h2>
                        <p>We use the information we collect to provide, maintain, and improve our services, to process transactions, and to communicate with you about your account and our services.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Sharing of Information</h2>
                        <p>We do not share your personal information with third parties except as required to provide our services (e.g., sharing BVN and name with bank partners for KYC) or as required by law.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Security</h2>
                        <p>We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction.</p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
};
