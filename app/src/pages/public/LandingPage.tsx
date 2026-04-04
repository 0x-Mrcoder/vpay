import React from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    Shield,
    Zap,
    Globe,
    CreditCard,
    Code,
    Terminal,
    Server,
    Send
} from 'lucide-react';
import { Navbar } from '../../components/public/Navbar';
import { Footer } from '../../components/public/Footer';

export const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-primary-100 selection:text-primary-900">
            <Navbar transparent />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-100/40 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary-50/60 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 border border-primary-100 text-primary-700 font-bold text-xs uppercase tracking-wider mb-8 animate-fade-in-up">
                            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
                            Powering the next generation of fintech
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-black text-gray-900 mb-6 leading-tight tracking-tight">
                            The Ultimate Payment <br />
                            Gateway for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-700">Small Businesses</span>
                        </h1>
                        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Accept payments, manage virtual accounts, and scale your small business with
                            enterprise-grade payment infrastructure designed for growth.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link to="/register" className="w-full sm:w-auto px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-xl shadow-gray-900/20 hover:shadow-gray-900/30 transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 group">
                                Start Building Now
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link to="/api-docs" className="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 font-bold rounded-2xl border border-gray-200 hover:border-primary-500 hover:text-primary-600 shadow-sm hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-300 flex items-center justify-center gap-2">
                                <Code size={18} />
                                Documentation
                            </Link>
                        </div>

                        <div className="mt-20 pt-10 border-t border-gray-100/50 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Trusted by leading companies</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="py-24 bg-white relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl transform rotate-3 opacity-20"></div>
                            <div className="relative bg-gray-50 rounded-3xl p-8 border border-gray-100 shadow-xl">
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-white rounded-xl shadow-sm text-primary-600 shrink-0">
                                            <Shield size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900">Secure & Reliable</h3>
                                            <p className="text-gray-600 text-sm mt-1">Bank-grade security standards protecting every transaction.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-white rounded-xl shadow-sm text-primary-600 shrink-0">
                                            <Zap size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900">Lightning Fast</h3>
                                            <p className="text-gray-600 text-sm mt-1">99.99% uptime with sub-second transaction processing.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-white rounded-xl shadow-sm text-primary-600 shrink-0">
                                            <Globe size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900">Global Scale</h3>
                                            <p className="text-gray-600 text-sm mt-1">Infrastructure built to support businesses across Africa.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <span className="text-primary-600 font-bold tracking-wider uppercase text-sm">About Us</span>
                            <h2 className="text-4xl font-black text-gray-900 mt-2 mb-6">Empowering Your Digital Economy</h2>
                            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                                VTStack is more than just a payment gateway. We are the backbone of modern small businesses, providing the essential infrastructure needed to process payments, manage virtual accounts, and automate verified transactions.
                            </p>
                            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                                Whether you're a startup or an enterprise, our platform scales with you, offering robust APIs and intuitive tools to manage your financial flows.
                            </p>
                            <Link to="/about" className="text-primary-600 font-bold hover:text-primary-700 flex items-center gap-2 group">
                                Learn more about our mission <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-primary-600 font-bold tracking-wider uppercase text-sm">Features</span>
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-3 mb-4">Everything you need to succeed</h2>
                        <p className="text-gray-600 text-lg">Powerful tools designed to help you build, launch, and scale your fintech product.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { icon: CreditCard, title: 'Virtual Accounts', desc: 'Instantly generate dedicated virtual bank accounts for your users to fund their wallets.' },
                            { icon: Zap, title: 'Instant Settlement', desc: 'Receive payments instantly and settle to your bank account without delays.' },
                            { icon: Shield, title: 'Fraud Protection', desc: 'Advanced fraud detection systems to keep your platform and users safe.' },
                            { icon: Send, title: 'Automated Payouts', desc: 'Securely send money to any bank account or wallet with our automated payout system.' },
                            { icon: Server, title: 'Webhooks', desc: 'Real-time notifications for every transaction event on your platform.' },
                            { icon: Terminal, title: 'Developer Tools', desc: 'Comprehensive API documentation, sandboxes, and developer logs.' }
                        ].map((feature, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300 border border-gray-100 group">
                                <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 mb-6 group-hover:bg-primary-500 group-hover:text-white transition-colors duration-300">
                                    <feature.icon size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Charges / Pricing Section */}
            <section id="pricing" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-primary-600 font-bold tracking-wider uppercase text-sm">Pricing</span>
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-3 mb-4">Simple, Transparent Pricing</h2>
                        <p className="text-gray-600 text-lg">No hidden fees. Pay only for what you use.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <div className="bg-gray-50 border border-gray-200 rounded-3xl p-8 hover:border-primary-300 transition-colors">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Starter</h3>
                            <p className="text-gray-500 text-sm mb-6">Perfect for new businesses.</p>
                            <div className="flex items-baseline mb-6">
                                <span className="text-4xl font-black text-gray-900">1%</span>
                                <span className="text-gray-500 ml-2">/ transaction</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 text-sm text-gray-600"><span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span> Capped at ₦2000</li>
                                <li className="flex items-center gap-3 text-sm text-gray-600"><span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span> Instant Settlement</li>
                                <li className="flex items-center gap-3 text-sm text-gray-600"><span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span> Standard Support</li>
                            </ul>
                            <Link to="/register" className="block w-full py-3 px-4 bg-white border border-gray-200 text-gray-900 font-bold rounded-xl text-center hover:border-primary-500 hover:text-primary-600 transition-colors">Get Started</Link>
                        </div>

                        <div className="bg-gray-900 text-white rounded-3xl p-8 relative transform md:-translate-y-4 shadow-2xl shadow-primary-500/20 border border-gray-800">
                            <div className="absolute top-0 right-0 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">POPULAR</div>
                            <h3 className="text-xl font-bold mb-2">Growth</h3>
                            <p className="text-gray-400 text-sm mb-6">For scaling platforms.</p>
                            <div className="flex items-baseline mb-6">
                                <span className="text-4xl font-black text-primary-400">1%</span>
                                <span className="text-gray-400 ml-2">/ transaction</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 text-sm text-gray-300"><span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span> Capped at ₦1500</li>
                                <li className="flex items-center gap-3 text-sm text-gray-300"><span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span> Instant Settlement</li>
                                <li className="flex items-center gap-3 text-sm text-gray-300"><span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span> Priority Support</li>
                                <li className="flex items-center gap-3 text-sm text-gray-300"><span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span> Dedicated Account Manager</li>
                            </ul>
                            <Link to="/register" className="block w-full py-3 px-4 bg-primary-500 text-white font-bold rounded-xl text-center hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/40">Choose Growth</Link>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-3xl p-8 hover:border-primary-300 transition-colors">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise</h3>
                            <p className="text-gray-500 text-sm mb-6">For high volume processing.</p>
                            <div className="flex items-baseline mb-6">
                                <span className="text-4xl font-black text-gray-900">Custom</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 text-sm text-gray-600"><span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span> Volume Discounts</li>
                                <li className="flex items-center gap-3 text-sm text-gray-600"><span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span> 24/7 Dedicated Support</li>
                                <li className="flex items-center gap-3 text-sm text-gray-600"><span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span> Custom Integration</li>
                            </ul>
                            <Link to="/contact" className="block w-full py-3 px-4 bg-white border border-gray-200 text-gray-900 font-bold rounded-xl text-center hover:border-primary-500 hover:text-primary-600 transition-colors">Contact Sales</Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Developer Section */}
            <section id="developers" className="py-24 bg-gray-900 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/20 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <span className="text-primary-500 font-bold tracking-wider uppercase text-sm">For Developers</span>
                            <h2 className="text-3xl md:text-5xl font-black mt-3 mb-6">Built for builders</h2>
                            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                                Our API is designed to be intuitive and powerful. Get started in minutes with our comprehensive documentation and SDKs.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link to="/api-docs" className="px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center gap-2">
                                    <Terminal size={18} /> Read the Docs
                                </Link>
                                <a href="https://github.com/vtstack" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 border border-gray-700">
                                    <Code size={18} /> View on GitHub
                                </a>
                            </div>
                        </div>
                        <div className="bg-gray-950 rounded-2xl p-6 font-mono text-sm border border-gray-800 shadow-2xl">
                            <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-4">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="ml-2 text-gray-500 text-xs">POST /api/v1/virtual-accounts</span>
                            </div>
                            <div className="space-y-2">
                                <div className="text-purple-400">const <span className="text-blue-400">response</span> = <span className="text-purple-400">await</span> api.<span className="text-yellow-300">createAccount</span>({`{`}</div>
                                <div className="pl-4 text-green-400">email: <span className="text-orange-300">'user@example.com'</span>,</div>
                                <div className="pl-4 text-green-400">firstName: <span className="text-orange-300">'John'</span>,</div>
                                <div className="pl-4 text-green-400">lastName: <span className="text-orange-300">'Doe'</span>,</div>
                                <div className="pl-4 text-green-400">bvn: <span className="text-orange-300">'12345678901'</span></div>
                                <div className="text-purple-400">{`}`});</div>
                                <div className="text-gray-500">// Returns</div>
                                <div className="text-purple-400">{`{`}</div>
                                <div className="pl-4 text-green-400">"success": <span className="text-blue-400">true</span>,</div>
                                <div className="pl-4 text-green-400">"accountNumber": <span className="text-orange-300">"9012345678"</span>,</div>
                                <div className="pl-4 text-green-400">"bankName": <span className="text-orange-300">"PalmPay"</span></div>
                                <div className="text-purple-400">{`}`}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Powered By Section */}
            <section className="py-20 bg-primary-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-black text-gray-900 mb-6">Powered by VTfree</h2>
                    <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                        VTStack is built on the robust, scalable, and secure infrastructure of VTfree. Experience enterprise-grade reliability for your payment flows.
                    </p>
                    <a href="https://vtfree.com.ng/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-bold text-primary-600 hover:text-primary-700">
                        Visit VTfree <ArrowRight size={18} />
                    </a>
                </div>
            </section>

            <Footer />
        </div>
    );
};
