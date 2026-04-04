import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import vtpayLogo from '../../assets/logo.png';

export const Footer: React.FC = () => {
    return (
        <footer className="bg-gray-950 text-white pt-20 pb-10 border-t border-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
                    <div className="col-span-2 md:col-span-1">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="bg-primary-50 p-1.5 rounded-lg">
                                <img src={vtpayLogo} alt="VTStack" className="h-10 w-auto " />
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Modern payment infrastructure for the internet economy.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-6">Product</h4>
                        <ul className="space-y-4 text-sm text-gray-400">
                            <li><a href="/#features" className="hover:text-primary-500 transition-colors">Features</a></li>
                            <li><a href="/#pricing" className="hover:text-primary-500 transition-colors">Pricing</a></li>
                            <li><Link to="/api-docs" className="hover:text-primary-500 transition-colors">API Keys</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-6">Resources</h4>
                        <ul className="space-y-4 text-sm text-gray-400">
                            <li><Link to="/api-docs" className="hover:text-primary-500 transition-colors">Documentation</Link></li>
                            <li><Link to="/api-reference" className="hover:text-primary-500 transition-colors">API Reference</Link></li>
                            <li><Link to="/status" className="hover:text-primary-500 transition-colors">Status</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-6">Company</h4>
                        <ul className="space-y-4 text-sm text-gray-400">
                            <li><Link to="/about" className="hover:text-primary-500 transition-colors">About</Link></li>
                            <li><Link to="/contact" className="hover:text-primary-500 transition-colors">Contact</Link></li>
                            <li><Link to="/terms" className="hover:text-primary-500 transition-colors">Terms of Service</Link></li>
                            <li><Link to="/privacy" className="hover:text-primary-500 transition-colors text-sm">Privacy Policy</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-500 text-sm">© {new Date().getFullYear()} VTStack Inc. All rights reserved.</p>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>Powered by</span>
                        <a href="https://vtfree.com.ng/" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-400 font-bold flex items-center gap-1 transition-colors anim-pulse">
                            VTfree <ArrowRight size={12} />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};
