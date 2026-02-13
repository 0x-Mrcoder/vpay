import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/Button';
import { ArrowLeft, Copy, Check, Shield, Globe, Zap, Bell, Menu, X, Server } from 'lucide-react';
import '../../styles/api-docs.css';
import vtpayLogo from '../../assets/logo.png';

export const ApiDocs: React.FC = () => {
    const [copied, setCopied] = React.useState('');
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(''), 2000);
    };

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    React.useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [isMenuOpen]);

    const CodeBlock = ({ code, id }: { code: string, id: string }) => (
        <div className="code-block-container border border-primary-100/50 shadow-sm">
            <button
                onClick={() => copyToClipboard(code, id)}
                className="code-block-copy-btn hover:bg-primary-50 text-gray-500 hover:text-primary-600"
                title="Copy to clipboard"
            >
                {copied === id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
            <pre className="code-block-pre bg-gray-900 text-gray-100 rounded-xl">
                <code>{code}</code>
            </pre>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FDFDFC]">
            {/* Header */}
            <header className="api-docs-header bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="api-docs-header-content max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-primary-600">
                            <ArrowLeft size={20} />
                        </Link>
                        <div className="flex items-center gap-3">
                            <img src={vtpayLogo} alt="VTStack API" className="h-8" />
                            <div className="h-6 w-px bg-gray-200 mx-1"></div>
                            <span className="font-bold text-gray-900 tracking-tight">API Reference</span>
                            <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-[10px] font-bold uppercase tracking-wider border border-primary-100">v1.0</span>
                        </div>
                    </div>
                    <div className="api-docs-header-actions flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-3">
                            <Link to="/login">
                                <Button variant="ghost" size="sm" className="font-semibold text-gray-600 hover:text-primary-600">Sign In</Button>
                            </Link>
                            <Link to="/register">
                                <Button size="sm" className="bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-lg shadow-primary-200/50">Get API Keys</Button>
                            </Link>
                        </div>
                        <button className="md:hidden p-2 text-gray-600" onClick={toggleMenu} aria-label="Toggle menu">
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </header>

            <div className="api-docs-container max-w-7xl mx-auto flex items-start pt-8 pb-20 px-4 gap-12">
                {/* Mobile Backdrop */}
                {isMenuOpen && (
                    <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMenuOpen(false)}></div>
                )}

                {/* Sidebar */}
                <aside className={`fixed md:sticky top-24 left-0 h-[calc(100vh-6rem)] w-64 bg-white md:bg-transparent z-50 transform transition-transform duration-300 md:translate-x-0 overflow-y-auto pr-4 ${isMenuOpen ? 'translate-x-0 p-6 shadow-2xl' : '-translate-x-full md:shadow-none'}`}>
                    <nav className="space-y-8">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 pl-3">Getting Started</p>
                            <ul className="space-y-1">
                                <li>
                                    <a href="#introduction" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                                        <Globe size={16} /> Introduction
                                    </a>
                                </li>
                                <li>
                                    <a href="#authentication" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                                        <Shield size={16} /> Authentication
                                    </a>
                                </li>
                                <li>
                                    <a href="#base-url" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                                        <Server size={16} /> Base URL
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 pl-3">Virtual Accounts</p>
                            <ul className="space-y-1">
                                <li><a href="#create-account" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors ml-4 border-l-2 border-transparent hover:border-primary-300">Create Account</a></li>
                                <li><a href="#list-accounts" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors ml-4 border-l-2 border-transparent hover:border-primary-300">Fetch Accounts</a></li>
                                <li><a href="#get-balance" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors ml-4 border-l-2 border-transparent hover:border-primary-300">Fetch Balance</a></li>
                            </ul>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 pl-3">Notifications</p>
                            <ul className="space-y-1">
                                <li>
                                    <a href="#webhooks" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                                        <Bell size={16} /> Webhooks
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </nav>
                </aside>

                {/* Content */}
                <main className="flex-1 min-w-0 max-w-3xl pb-20">
                    <section id="introduction" className="scroll-mt-28 mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-6">Introduction</h2>
                        <p className="text-gray-600 leading-relaxed mb-6">
                            Welcome to the VTStack API. This API is dedicated to <strong>Virtual Account Management</strong>.
                            It allows you to seamlessly create and manage dedicated virtual bank accounts for your customers,
                            check balances, and retrieve account details.
                        </p>
                        <div className="bg-primary-50/50 border border-primary-100 rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-start">
                            <div className="p-3 bg-white rounded-xl shadow-sm text-primary-600 shrink-0">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 mb-2">Dedicated Infrastructure</h4>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    VTStack provides robust virtual account infrastructure powered by PalmPay, ensuring high reliability and instant settlements for your fintech applications.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section id="authentication" className="scroll-mt-28 mb-16">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Authentication</h2>
                        <p className="text-gray-600 mb-6">
                            Authenticate your requests by including your Secret Key in the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-primary-600 font-mono text-sm border border-gray-200">x-api-key</code> header.
                        </p>
                        <CodeBlock
                            id="auth"
                            code={`x-api-key: sk_live_xxxxxxxxxxxxxxxxxxxx`}
                        />
                        <div className="mt-6 bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                            <Shield size={20} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-amber-900 mb-1">Security Warning</h4>
                                <p className="text-xs text-amber-800">Never share your secret keys in client-side code or public repositories.</p>
                            </div>
                        </div>
                    </section>

                    <section id="base-url" className="scroll-mt-28 mb-16">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Base URL</h2>
                        <p className="text-gray-600 mb-6">All API requests should be made to our production endpoint:</p>
                        <CodeBlock
                            id="base-url"
                            code={`https://vtpayapi.vtfree.com.ng/api`}
                        />
                    </section>

                    <section id="endpoints" className="scroll-mt-28 mb-16">
                        <h2 className="text-2xl font-bold text-gray-900 mb-8">Virtual Account Endpoints</h2>

                        <div className="space-y-12">
                            {/* 1. Create Virtual Account */}
                            <div id="create-account" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transistion-all hover:border-primary-200 hover:shadow-md">
                                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold font-mono">POST</span>
                                        <h3 className="font-bold text-gray-900">Create Virtual Account</h3>
                                    </div>
                                    <span className="font-mono text-sm text-gray-500 bg-white px-3 py-1 rounded-lg border border-gray-200">/virtual-accounts</span>
                                </div>

                                <div className="p-6 md:p-8">
                                    <p className="text-gray-600 mb-6 text-sm">
                                        Generate a new dedicated virtual account for a customer.
                                        The account is automatically assigned to <strong>PalmPay</strong>.
                                    </p>

                                    <div className="bg-gray-50 rounded-xl p-5 mb-8 border border-gray-200">
                                        <h4 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">Required Parameters</h4>
                                        <ul className="space-y-3">
                                            <li className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                                                <code className="text-primary-600 font-bold bg-white px-2 py-0.5 rounded border border-gray-200">firstName</code>
                                                <span className="text-gray-600">Customer's first name.</span>
                                            </li>
                                            <li className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                                                <code className="text-primary-600 font-bold bg-white px-2 py-0.5 rounded border border-gray-200">lastName</code>
                                                <span className="text-gray-600">Customer's last name.</span>
                                            </li>
                                            <li className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                                                <code className="text-primary-600 font-bold bg-white px-2 py-0.5 rounded border border-gray-200">email</code>
                                                <span className="text-gray-600">Customer's email address.</span>
                                            </li>
                                            <li className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                                                <code className="text-primary-600 font-bold bg-white px-2 py-0.5 rounded border border-gray-200">bvn</code>
                                                <span className="text-gray-600">11-digit Bank Verification Number.</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <h4 className="text-sm font-bold text-gray-900 mb-3">Request Body</h4>
                                    <CodeBlock
                                        id="req-create"
                                        code={`{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "08012345678",
  "bvn": "12345678901",
  "identityType": "INDIVIDUAL",
  "reference": "cust_ref_12345"
}`}
                                    />

                                    <h4 className="text-sm font-bold text-gray-900 mt-8 mb-3">Response</h4>
                                    <CodeBlock
                                        id="res-create"
                                        code={`{
  "success": true,
  "message": "Virtual account created successfully",
  "data": {
    "id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "accountNumber": "1234567890",
    "accountName": "John Doe",
    "alias": "John Doe",
    "reference": "cust_ref_12345",
    "bankName": "PalmPay",
    "status": "active"
  }
}`}
                                    />
                                </div>
                            </div>

                            {/* 2. Fetch Virtual Accounts */}
                            <div id="list-accounts" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transistion-all hover:border-primary-200 hover:shadow-md">
                                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold font-mono">GET</span>
                                        <h3 className="font-bold text-gray-900">Fetch Virtual Accounts</h3>
                                    </div>
                                    <span className="font-mono text-sm text-gray-500 bg-white px-3 py-1 rounded-lg border border-gray-200">/virtual-accounts</span>
                                </div>

                                <div className="p-6 md:p-8">
                                    <p className="text-gray-600 mb-6 text-sm">Retrieve a list of all virtual accounts created under your API key.</p>

                                    <h4 className="text-sm font-bold text-gray-900 mb-3">Response</h4>
                                    <CodeBlock
                                        id="res-list"
                                        code={`{
  "success": true,
  "data": [
    {
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "accountNumber": "1234567890",
      "accountName": "John Doe",
      "bankName": "PalmPay",
      "status": "active",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}`}
                                    />
                                </div>
                            </div>

                            {/* 3. Fetch Account Balance */}
                            <div id="get-balance" className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transistion-all hover:border-primary-200 hover:shadow-md">
                                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold font-mono">GET</span>
                                        <h3 className="font-bold text-gray-900">Fetch Account Balance</h3>
                                    </div>
                                    <span className="font-mono text-sm text-gray-500 bg-white px-3 py-1 rounded-lg border border-gray-200">/virtual-accounts/:accountNumber/balance</span>
                                </div>

                                <div className="p-6 md:p-8">
                                    <p className="text-gray-600 mb-6 text-sm">Fetch the current balance of a specific virtual account.</p>

                                    <h4 className="text-sm font-bold text-gray-900 mb-3">Response</h4>
                                    <CodeBlock
                                        id="res-balance"
                                        code={`{
  "success": true,
  "data": {
    "balanceAmount": 0,
    "availableBalance": 0,
    "currency": "NGN"
  }
}`}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="webhooks" className="scroll-mt-28 mb-16">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Webhooks</h2>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            VTStack uses webhooks to notify your application when an event happens in your account (e.g., incoming payments).
                            Configure your webhook URL in the developer dashboard.
                        </p>
                        <div className="code-block-container border border-primary-100/50 shadow-sm">
                            <h4 className="text-primary-400 font-bold px-5 pt-4 text-xs uppercase tracking-widest bg-gray-900 rounded-t-xl mb-0 pb-2">Sample Payload</h4>
                            <pre className="code-block-pre rounded-t-none mt-0">
                                <code>{`{
  "event": "payment.success",
  "data": {
    "amount": 5000,
    "reference": "unique_ref_001",
    "accountNumber": "1234567890",
    "customer": "John Doe",
    "timestamp": "2024-01-15T12:00:00.000Z"
  }
}`}</code>
                            </pre>
                        </div>
                    </section>
                </main>
            </div>
        </div >
    );
};
