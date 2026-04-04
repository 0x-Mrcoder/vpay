import React from 'react';
import { Navbar } from '../../components/public/Navbar';
import { Footer } from '../../components/public/Footer';

export const Terms: React.FC = () => {
    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-primary-100 selection:text-primary-900">
            <Navbar />
            
            <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-gray-50 border-b border-gray-100">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-100/40 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary-50/60 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3"></div>
                </div>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <h1 className="text-4xl lg:text-5xl font-black text-gray-900 mb-6 tracking-tight">Terms of Service</h1>
                    <p className="text-lg text-gray-600 font-medium">Last updated: {new Date().toLocaleDateString()}</p>
                </div>
            </header>

            <main className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="prose prose-lg prose-primary max-w-none text-gray-600 space-y-10">
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                        <p>By accessing or using VTStack's services, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Use License</h2>
                        <p>Permission is granted to temporarily download one copy of the materials (information or software) on VTStack's website for personal, non-commercial transitory viewing only.</p>
                        <ul className="list-disc pl-6 space-y-2 mt-4">
                            <li>Modify or copy the materials.</li>
                            <li>Use the materials for any commercial purpose.</li>
                            <li>Attempt to decompile or reverse engineer any software contained on VTStack's website.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Virtual Account Usage</h2>
                        <p>Users are responsible for maintaining the security of their API keys and account credentials. VTStack is not liable for any loss resulting from unauthorized access to your account due to negligence.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Limitations</h2>
                        <p>In no event shall VTStack or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on VTStack's website.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Revisions and Errata</h2>
                        <p>The materials appearing on VTStack's website could include technical, typographical, or photographic errors. VTStack does not warrant that any of the materials on its website are accurate, complete, or current.</p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
};
