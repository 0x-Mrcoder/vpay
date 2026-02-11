import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/Button';
import { ArrowLeft, Copy, Check, Shield, Globe, Zap, Bell, Menu, X } from 'lucide-react';
import '../../styles/api-docs.css';
import vtpayLogo from '../../assets/images/vtpay-logo.svg';

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
        <div className="code-block-container">
            <button
                onClick={() => copyToClipboard(code, id)}
                className="code-block-copy-btn"
                title="Copy to clipboard"
            >
                {copied === id ? <Check size={16} className="text-success" /> : <Copy size={16} />}
            </button>
            <pre className="code-block-pre">
                <code>{code}</code>
            </pre>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="api-docs-header">
                <div className="api-docs-header-content">
                    <div className="api-docs-logo">
                        <Link to="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <ArrowLeft size={20} className="text-slate-600" />
                        </Link>
                        <h1>
                            <img src={vtpayLogo} alt="VTPay API" style={{ height: '32px', marginRight: '10px' }} />
                            <span className="api-docs-title-text">Documentation</span>
                        </h1>
                    </div>
                    <div className="api-docs-header-actions">
                        <div className="desktop-actions">
                            <Link to="/login">
                                <Button variant="outline" size="sm">Sign In</Button>
                            </Link>
                            <Link to="/register">
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">Get API Keys</Button>
                            </Link>
                        </div>
                        <button className="api-docs-menu-btn" onClick={toggleMenu} aria-label="Toggle menu">
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </header>

            <div className="api-docs-container">
                {/* Mobile Backdrop */}
                {isMenuOpen && (
                    <div className="api-docs-mobile-backdrop" onClick={() => setIsMenuOpen(false)}></div>
                )}

                {/* Sidebar */}
                <aside className={`api-docs-sidebar ${isMenuOpen ? 'mobile-active' : ''}`}>
                    <nav>
                        <p className="text-xs font-bold text-green-200/60 uppercase tracking-widest mb-4 px-4">Getting Started</p>
                        <ul>
                            <li>
                                <a href="#introduction" onClick={() => setIsMenuOpen(false)}>
                                    <Globe size={18} /> Introduction
                                </a>
                            </li>
                            <li>
                                <a href="#authentication" onClick={() => setIsMenuOpen(false)}>
                                    <Shield size={18} /> Authentication
                                </a>
                            </li>
                            <li>
                                <a href="#base-url" onClick={() => setIsMenuOpen(false)}>
                                    <Zap size={18} /> Base URL
                                </a>
                            </li>
                        </ul>

                        <p className="text-xs font-bold text-green-200/60 uppercase tracking-widest mt-8 mb-4 px-4">Virtual Accounts</p>
                        <ul className="api-docs-subnav">
                            <li><a href="#create-account" onClick={() => setIsMenuOpen(false)}>Create Account</a></li>
                            <li><a href="#list-accounts" onClick={() => setIsMenuOpen(false)}>Fetch Accounts</a></li>
                            <li><a href="#get-balance" onClick={() => setIsMenuOpen(false)}>Fetch Balance</a></li>
                            <li><a href="#get-transactions" onClick={() => setIsMenuOpen(false)}>Fetch Transactions</a></li>
                        </ul>

                        <p className="text-xs font-bold text-green-200/60 uppercase tracking-widest mt-8 mb-4 px-4">Notifications</p>
                        <ul>
                            <li>
                                <a href="#webhooks" onClick={() => setIsMenuOpen(false)}>
                                    <Bell size={18} /> Webhooks
                                </a>
                            </li>
                        </ul>
                    </nav>
                </aside>

                {/* Content */}
                <main className="api-docs-content">
                    <section id="introduction" className="api-docs-section">
                        <h2>Introduction</h2>
                        <p>
                            Welcome to the VTPay API. This API is dedicated to <strong>Virtual Account Management</strong>.
                            It allows you to seamlessly create and manage dedicated virtual bank accounts for your customers,
                            check balances, and retrieve transaction histories.
                        </p>
                        <div className="alert alert-success mt-4">
                            <div className="alert-icon">
                                <Zap size={20} />
                            </div>
                            <div className="alert-content">
                                <h4>Dedicated Service</h4>
                                <p>VTPay specializes in providing robust virtual account infrastructure for fintech applications.</p>
                            </div>
                        </div>
                    </section>

                    <section id="authentication" className="api-docs-section">
                        <h2>Authentication</h2>
                        <p>
                            Authenticate your requests by including your Secret Key in the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-600 font-mono">x-api-key</code> header.
                        </p>
                        <CodeBlock
                            id="auth"
                            code={`x-api-key: sk_live_xxxxxxxxxxxxxxxxxxxx`}
                        />
                        <div className="alert alert-warning mt-4">
                            <div className="alert-icon">
                                <Shield size={20} />
                            </div>
                            <div className="alert-content">
                                <h4>Security Warning</h4>
                                <p>Never share your secret keys in client-side code or public repositories.</p>
                            </div>
                        </div>
                    </section>

                    <section id="base-url" className="api-docs-section">
                        <h2>Base URL</h2>
                        <p>All API requests should be made to our production endpoint:</p>
                        <CodeBlock
                            id="base-url"
                            code={`https://vtpayapi.vtfree.com.ng/api`}
                        />
                    </section>

                    <section id="endpoints" className="api-docs-section">
                        <h2 className="mb-8">Virtual Account Endpoints</h2>

                        <div className="api-endpoints-container">
                            {/* 1. Create Virtual Account */}
                            <div id="create-account" className="api-endpoint-card">
                                <div className="api-endpoint-header">
                                    <span className="api-method-badge api-method-post">POST</span>
                                    <h3>Create Virtual Account</h3>
                                </div>
                                <div className="mb-4">
                                    <span className="api-endpoint-path">/virtual-accounts</span>
                                </div>
                                <p className="api-endpoint-description">
                                    Generate a new dedicated virtual account for a customer.
                                    You must specify a <code>bankType</code> from our supported list.
                                </p>

                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-6">
                                    <h4 className="text-emerald-800 text-xs font-bold uppercase tracking-widest mb-3">Supported Bank Types</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
                                        {[
                                            { code: 'fcmb', name: 'FCMB' },
                                            { code: 'fidelity', name: 'Fidelity Bank' },
                                            { code: 'moniepoint', name: 'Moniepoint' }
                                        ].map(bank => (
                                            <div key={bank.code} className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                                <span className="text-xs font-mono text-emerald-700 font-bold">{bank.code}</span>
                                                <span className="text-[10px] text-emerald-600/70 font-medium">({bank.name})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <h4>Request Body</h4>
                                <CodeBlock
                                    id="req-create"
                                    code={`{
  "bankType": "moniepoint",
  "accountName": "John Doe",
  "email": "john.doe@example.com",
  "reference": "cust_ref_12345",
  "phone": "08012345678"
}`}
                                />

                                <h4 className="mt-6">Response</h4>
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
    "bankName": "Moniepoint",
    "bankType": "moniepoint",
    "status": "active"
  }
}`}
                                />
                            </div>

                            {/* 2. Fetch Virtual Accounts */}
                            <div id="list-accounts" className="api-endpoint-card">
                                <div className="api-endpoint-header">
                                    <span className="api-method-badge api-method-get">GET</span>
                                    <h3>Fetch Virtual Accounts</h3>
                                </div>
                                <div className="mb-4">
                                    <span className="api-endpoint-path">/virtual-accounts</span>
                                </div>
                                <p className="api-endpoint-description">Retrieve a list of all virtual accounts created under your API key.</p>

                                <h4>Response</h4>
                                <CodeBlock
                                    id="res-list"
                                    code={`{
  "success": true,
  "data": [
    {
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "accountNumber": "1234567890",
      "accountName": "John Doe",
      "bankName": "GTBank",
      "status": "active",
      "createdAt": "2024-01-15T10:00:00.000Z"
    },
    {
      "id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "accountNumber": "0987654321",
      "accountName": "Jane Smith",
      "bankName": "GTBank",
      "status": "active",
      "createdAt": "2024-01-14T15:30:00.000Z"
    }
  ]
}`}
                                />
                            </div>

                            {/* 3. Fetch Account Balance */}
                            <div id="get-balance" className="api-endpoint-card">
                                <div className="api-endpoint-header">
                                    <span className="api-method-badge api-method-get">GET</span>
                                    <h3>Fetch Account Balance</h3>
                                </div>
                                <div className="mb-4">
                                    <span className="api-endpoint-path">/virtual-accounts/:accountNumber/balance</span>
                                </div>
                                <p className="api-endpoint-description">Fetch the current balance of a specific virtual account.</p>

                                <h4>Response</h4>
                                <CodeBlock
                                    id="res-balance"
                                    code={`{
  "success": true,
  "data": {
    "balance": 50000.00,
    "currency": "NGN",
    "accountNumber": "1234567890"
  }
}`}
                                />
                            </div>

                            {/* 4. Fetch Transactions */}
                            <div id="get-transactions" className="api-endpoint-card">
                                <div className="api-endpoint-header">
                                    <span className="api-method-badge api-method-get">GET</span>
                                    <h3>Fetch Transactions</h3>
                                </div>
                                <div className="mb-4">
                                    <span className="api-endpoint-path">/virtual-accounts/:accountNumber/transactions</span>
                                </div>
                                <p className="api-endpoint-description">Retrieve the transaction history for a specific virtual account.</p>

                                <h4>Response</h4>
                                <CodeBlock
                                    id="res-transactions"
                                    code={`{
  "success": true,
  "data": [
    {
      "reference": "TXN_123456789",
      "amount": 5000.00,
      "type": "credit",
      "description": "Transfer from Bank A",
      "date": "2024-01-15T12:00:00.000Z",
      "status": "success"
    },
    {
      "reference": "TXN_987654321",
      "amount": 2000.00,
      "type": "debit",
      "description": "Service Charge",
      "date": "2024-01-14T09:15:00.000Z",
      "status": "success"
    }
  ]
}`}
                                />
                            </div>
                        </div>
                    </section>

                    <section id="webhooks" className="api-docs-section">
                        <h2>Webhooks</h2>
                        <p>
                            VTPay uses webhooks to notify your application when an event happens in your account (e.g., incoming payments).
                            Configure your webhook URL in the developer dashboard.
                        </p>
                        <div className="code-block-container mt-6">
                            <h4 className="text-emerald-400 font-bold px-5 pt-4">Sample Payload</h4>
                            <pre className="code-block-pre">
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
