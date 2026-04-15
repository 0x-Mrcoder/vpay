import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/Button';
import { 
    ArrowLeft, 
    Copy, 
    Check, 
    Shield, 
    Globe, 
    Zap, 
    Bell, 
    Menu, 
    X, 
    Server, 
    AlertCircle, 
    Lock, 
    RefreshCcw,
    Layout,
    Cpu,
    Building,
    Search
} from 'lucide-react';
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

    const CodeBlock = ({ code, id, method, path }: { code: string, id: string, method?: string, path?: string }) => (
        <div className="code-block-container border border-primary-100/30">
            <div className="code-block-header bg-gray-900/50">
                <div className="flex items-center gap-3">
                    {method && (
                        <span className={`method-badge method-${method.toLowerCase()}`}>
                            {method}
                        </span>
                    )}
                    {path && <span className="text-xs font-mono text-gray-400 font-bold">{path}</span>}
                    {!method && !path && <span className="text-xs font-mono text-gray-400 font-bold uppercase tracking-widest">Example Request</span>}
                </div>
                <button
                    onClick={() => copyToClipboard(code, id)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-primary-docs transition-colors"
                    title="Copy to clipboard"
                >
                    {copied === id ? <Check size={14} className="text-primary-docs" /> : <Copy size={14} />}
                </button>
            </div>
            <pre className="code-block-pre">
                <code>{code}</code>
            </pre>
        </div>
    );

    const navLinks = [
        { group: 'Getting Started', links: [
            { id: 'introduction', name: 'Introduction', icon: Globe },
            { id: 'quickstart', name: 'Quick Start', icon: Zap },
            { id: 'authentication', name: 'Authentication', icon: Lock },
            { id: 'base-url', name: 'Base URL', icon: Server },
        ]},
        { group: 'Core Resources', links: [
            { id: 'create-account', name: 'Create Account', icon: Cpu },
            { id: 'list-accounts', name: 'Fetch Accounts', icon: Layout },
            { id: 'get-balance', name: 'Fetch Balance', icon: RefreshCcw },
        ]},
        { group: 'Bank Verification', links: [
            { id: 'list-banks', name: 'List Banks', icon: Building },
            { id: 'verify-bank', name: 'Verify Account', icon: Search },
        ]},
        { group: 'Lifecycle', links: [
            { id: 'webhooks', name: 'Webhooks', icon: Bell },
            { id: 'errors', name: 'Errors & Retries', icon: AlertCircle },
            { id: 'best-practices', name: 'Best Practices', icon: Shield },
        ]}
    ];

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="api-docs-header">
                <div className="api-docs-header-content max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                            <ArrowLeft size={18} />
                        </Link>
                        <div className="flex items-center gap-3">
                            <img src={vtpayLogo} alt="VTStack API" className="h-8" />
                            <div className="h-6 w-px bg-gray-200 mx-1"></div>
                            <span className="font-black text-gray-900 tracking-tight">Docs</span>
                            <span className="px-2 py-0.5 rounded-md bg-primary-50 text-primary-docs text-[10px] font-black uppercase tracking-wider border border-primary-100">v1.2</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-3">
                            <Link to="/login">
                                <Button variant="ghost" size="sm" className="font-bold text-gray-600">Log In</Button>
                            </Link>
                            <Link to="/register">
                                <Button size="sm" className="bg-primary-docs hover:bg-primary-docs-hover text-white font-bold shadow-lg shadow-primary-docs/20">Get API Keys</Button>
                            </Link>
                        </div>
                        <button className="md:hidden p-2 text-gray-600" onClick={toggleMenu}>
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </header>

            <div className="api-docs-container max-w-7xl mx-auto">
                {/* Mobile Backdrop */}
                {isMenuOpen && (
                    <div className="api-docs-mobile-backdrop md:hidden" onClick={() => setIsMenuOpen(false)}></div>
                )}

                {/* Sidebar */}
                <aside className={`api-docs-sidebar ${isMenuOpen ? 'mobile-open' : ''}`}>
                    <nav>
                        {navLinks.map((group, idx) => (
                            <div key={idx}>
                                <p className="api-docs-sidebar-section-title">{group.group}</p>
                                <ul className="mb-8">
                                    {group.links.map((link) => (
                                        <li key={link.id}>
                                            <a 
                                                href={`#${link.id}`} 
                                                onClick={() => setIsMenuOpen(false)}
                                                className="group"
                                            >
                                                <link.icon size={16} className="text-gray-500 group-hover:text-primary-docs" /> {link.name}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="api-docs-main-wrapper font-sans text-gray-900 selection:bg-primary-100">
                    <div className="api-docs-content">
                        {/* Introduction */}
                        <section id="introduction" className="api-docs-section">
                            <h2>Introduction</h2>
                            <p>
                                Welcome to the VTStack API Reference. Our platform provides enterprise-grade infrastructure 
                                for Virtual Account Management, specifically optimized for small businesses and digital top-up platforms.
                            </p>
                            <p>
                                With VTStack, you can programmatically create dedicated virtual bank accounts through our partner 
                                <strong> PalmPay</strong>, enabling instant wallet funding and real-time transaction notifications.
                            </p>
                            
                            <div className="info-box">
                                <div className="info-box-icon">
                                    <Cpu size={24} />
                                </div>
                                <div className="info-box-content">
                                    <h4>Developer-First Infrastructure</h4>
                                    <p>Our APIs are built by engineers, for engineers. We handle the complex banking integration so you can focus on building your product.</p>
                                </div>
                            </div>
                        </section>

                        {/* Quick Start */}
                        <section id="quickstart" className="api-docs-section">
                            <h2>Quick Start</h2>
                            <p>Go from integration to production in 4 simple steps.</p>
                            
                            <div className="grid gap-6 mt-10">
                                {[
                                    { step: '01', title: 'Get API Keys', desc: 'Create a developer account and generate your Secret Keys in the dashboard.' },
                                    { step: '02', title: 'Configure Webhooks', desc: 'Set your webhook URL to receive instant notifications for every deposit.' },
                                    { step: '03', title: 'Create Virtual Account', desc: 'Use the SDK or API to create accounts for your customers instantly.' },
                                    { step: '04', title: 'Scale', desc: 'Monitor your transactions and manage your funds via our robust dashboard.' }
                                ].map((s, idx) => (
                                    <div key={idx} className="flex gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-primary-docs/30 transition-all">
                                        <div className="text-2xl font-black text-gray-200 leading-none">{s.step}</div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 mb-1">{s.title}</h4>
                                            <p className="text-sm text-gray-500 mb-0">{s.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Authentication */}
                        <section id="authentication" className="api-docs-section">
                            <div className="flex items-center gap-2 mb-4 text-primary-docs">
                                <Lock size={20} />
                                <span className="font-bold text-sm tracking-wide uppercase">Security</span>
                            </div>
                            <h2>Authentication</h2>
                            <p>
                                All API requests require a secret key to be included in the header of your request. 
                                Your secret keys allow access to your account sensitive operations, so keep them secure.
                            </p>
                            
                            <CodeBlock 
                                id="auth-code"
                                code={`// Use the x-api-key header for all requests\nx-api-key: YOUR_SECRET_KEY`}
                            />

                            <div className="info-box bg-amber-50 border-amber-200">
                                <div className="info-box-icon text-amber-600 shadow-amber-500/10">
                                    <Shield size={24} />
                                </div>
                                <div className="info-box-content">
                                    <h4 className="text-amber-900">Protect your Secret Key</h4>
                                    <p className="text-amber-800 font-medium">Never expose your secret keys in frontend code, mobile apps, or public repositories. Use server-side variables to store them.</p>
                                </div>
                            </div>
                        </section>

                        {/* Base URL */}
                        <section id="base-url" className="api-docs-section">
                            <h2>Base URL</h2>
                            <p>Our production API endpoint is available at:</p>
                            <CodeBlock 
                                id="base-url-code"
                                code={`https://api.vtstack.com.ng/api`}
                            />
                        </section>

                        {/* Endpoints */}
                        <section id="endpoints" className="api-docs-section">
                            <h2>Endpoints</h2>
                            
                            {/* Create Account */}
                            <div id="create-account" className="mt-12">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="method-badge method-post">POST</span>
                                    <h3 className="font-black m-0 tracking-tight">Create Virtual Account</h3>
                                </div>
                                <p>Creates a new dedicated virtual bank account (PalmPay) for your customer.</p>
                                
                                <div className="docs-table-wrapper">
                                    <table className="docs-table">
                                        <thead>
                                            <tr>
                                                <th>Parameter</th>
                                                <th>Type</th>
                                                <th>Description</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="font-mono font-bold text-primary-docs">firstName</td>
                                                <td>string <span className="text-[10px] text-red-500 font-bold uppercase">(Req)</span></td>
                                                <td>Standard first name (Matches BVN record).</td>
                                            </tr>
                                            <tr>
                                                <td className="font-mono font-bold text-primary-docs">lastName</td>
                                                <td>string <span className="text-[10px] text-red-500 font-bold uppercase">(Req)</span></td>
                                                <td>Standard last name (Matches BVN record).</td>
                                            </tr>
                                            <tr>
                                                <td className="font-mono font-bold text-primary-docs">email</td>
                                                <td>string <span className="text-[10px] text-red-500 font-bold uppercase">(Req)</span></td>
                                                <td>Unique email address for the customer.</td>
                                            </tr>
                                            <tr>
                                                <td className="font-mono font-bold text-primary-docs">bvn</td>
                                                <td>string <span className="text-[10px] text-red-500 font-bold uppercase">(Req)</span></td>
                                                <td>11-digit BVN for identity verification.</td>
                                            </tr>
                                            <tr>
                                                <td className="font-mono font-bold text-primary-docs">reference</td>
                                                <td>string</td>
                                                <td>Your unique internal customer/transaction ID.</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <CodeBlock 
                                    id="create-json"
                                    method="POST"
                                    path="/virtual-accounts"
                                    code={`{\n  "firstName": "Hassan",\n  "lastName": "Ibrahim",\n  "email": "hassan@example.com",\n  "phone": "08012345678",\n  "bvn": "22123456789",\n  "reference": "user_id_102"\n}`}
                                />
                            </div>

                            {/* Fetch Accounts */}
                            <div id="list-accounts" className="mt-20">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="method-badge method-get">GET</span>
                                    <h3 className="font-black m-0 tracking-tight">Fetch Virtual Accounts</h3>
                                </div>
                                <p>Returns a paginated list of all virtual accounts associated with your platform.</p>
                                <CodeBlock 
                                    id="list-json"
                                    method="GET"
                                    path="/virtual-accounts"
                                    code={`{\n  "success": true,\n  "data": [\n    {\n      "accountNumber": "8102345678",\n      "accountName": "Hassan Ibrahim",\n      "bankName": "PalmPay",\n      "status": "active"\n    }\n  ]\n}`}
                                />
                            </div>
                        </section>

                        {/* Bank Verification */}
                        <section id="bank-verification" className="api-docs-section">
                            <h2>Bank Verification</h2>
                            <p>
                                Use VTStack's Bank Verification API to <strong>resolve and verify bank account details</strong> before 
                                initiating payouts. This helps prevent failed transfers by confirming the account holder's name 
                                and validating the account number against the bank.
                            </p>

                            <div className="info-box">
                                <div className="info-box-icon">
                                    <Building size={24} />
                                </div>
                                <div className="info-box-content">
                                    <h4>Why Verify?</h4>
                                    <p>Always verify a bank account before sending money. This prevents sending funds to the wrong recipient and reduces dispute 
                                    and chargeback risks. Verification is instant and powered by PalmPay infrastructure.</p>
                                </div>
                            </div>

                            {/* List Banks */}
                            <div id="list-banks" className="mt-12">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="method-badge method-get">GET</span>
                                    <h3 className="font-black m-0 tracking-tight">List Supported Banks</h3>
                                </div>
                                <p>Returns a list of all supported Nigerian banks with their codes. Use the <code>code</code> value when calling the verify endpoint.</p>

                                <CodeBlock 
                                    id="list-banks-req"
                                    method="GET"
                                    path="/banks"
                                    code={`curl -X GET https://api.vtstack.com.ng/api/banks \\
  -H "x-api-key: YOUR_SECRET_KEY"`}
                                />

                                <h4 className="text-sm font-bold text-gray-900 mt-8 mb-3">Success Response</h4>
                                <CodeBlock 
                                    id="list-banks-res"
                                    code={`{
  "success": true,
  "data": [
    { "code": "100033", "name": "PalmPay" },
    { "code": "044", "name": "Access Bank" },
    { "code": "058", "name": "Guaranty Trust Bank" },
    { "code": "033", "name": "United Bank for Africa" },
    { "code": "057", "name": "Zenith Bank" }
  ]
}`}
                                />
                            </div>

                            {/* Verify Bank Account */}
                            <div id="verify-bank" className="mt-20">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="method-badge method-get">GET</span>
                                    <h3 className="font-black m-0 tracking-tight">Verify Bank Account</h3>
                                </div>
                                <p>
                                    Performs a <strong>Name Enquiry</strong> — resolves an account number to the registered account holder name. 
                                    Pass the <code>bankCode</code> and <code>accountNumber</code> as query parameters.
                                </p>

                                <div className="docs-table-wrapper">
                                    <table className="docs-table">
                                        <thead>
                                            <tr>
                                                <th>Parameter</th>
                                                <th>Type</th>
                                                <th>Description</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="font-mono font-bold text-primary-docs">bankCode</td>
                                                <td>string <span className="text-[10px] text-red-500 font-bold uppercase">(Req)</span></td>
                                                <td>The bank code from the List Banks endpoint (e.g. <code>"044"</code> for Access Bank).</td>
                                            </tr>
                                            <tr>
                                                <td className="font-mono font-bold text-primary-docs">accountNumber</td>
                                                <td>string <span className="text-[10px] text-red-500 font-bold uppercase">(Req)</span></td>
                                                <td>The 10-digit NUBAN account number to verify.</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <h4 className="text-sm font-bold text-gray-900 mt-8 mb-3">Example Request</h4>
                                <CodeBlock 
                                    id="verify-bank-req"
                                    method="GET"
                                    path="/banks/verify?bankCode=044&accountNumber=0123456789"
                                    code={`curl -X GET "https://api.vtstack.com.ng/api/banks/verify?bankCode=044&accountNumber=0123456789" \\
  -H "x-api-key: YOUR_SECRET_KEY"`}
                                />

                                <h4 className="text-sm font-bold text-gray-900 mt-8 mb-3">Success Response</h4>
                                <CodeBlock 
                                    id="verify-bank-res-success"
                                    code={`{
  "success": true,
  "data": {
    "accountName": "HASSAN IBRAHIM",
    "accountNumber": "0123456789",
    "bankCode": "044"
  }
}`}
                                />

                                <h4 className="text-sm font-bold text-gray-900 mt-8 mb-3">Error Response</h4>
                                <CodeBlock 
                                    id="verify-bank-res-error"
                                    code={`// 400 — Missing parameters
{
  "success": false,
  "message": "bankCode and accountNumber are required"
}

// 400 — Invalid account
{
  "success": false,
  "message": "Bank resolution failed"
}`}
                                />

                                <div className="info-box bg-blue-50 border-blue-200 mt-8">
                                    <div className="info-box-icon text-blue-600 shadow-blue-500/10">
                                        <Shield size={24} />
                                    </div>
                                    <div className="info-box-content">
                                        <h4 className="text-blue-900">Integration Tip</h4>
                                        <p className="text-blue-800 font-medium">
                                            Always verify the account name with your user before proceeding with a transfer. 
                                            Display the resolved <code>accountName</code> and ask for explicit confirmation 
                                            to prevent wrong-account payouts.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Code Examples */}
                            <div className="mt-20">
                                <h3 className="font-black tracking-tight mb-6">Full Integration Example</h3>
                                <p className="mb-6">Here's a complete Node.js example showing how to verify a bank account before initiating a payout:</p>
                                <CodeBlock 
                                    id="verify-bank-full-example"
                                    code={`const axios = require('axios');

const API_KEY = 'sk_live_xxxxxxxxxxxx';
const BASE_URL = 'https://api.vtstack.com.ng/api';

// Step 1: Get list of supported banks
async function listBanks() {
  const { data } = await axios.get(BASE_URL + '/banks', {
    headers: { 'x-api-key': API_KEY }
  });
  console.log('Banks:', data.data);
  return data.data;
}

// Step 2: Verify a bank account
async function verifyAccount(bankCode, accountNumber) {
  const { data } = await axios.get(BASE_URL + '/banks/verify', {
    params: { bankCode, accountNumber },
    headers: { 'x-api-key': API_KEY }
  });

  if (data.success) {
    console.log('Account Name:', data.data.accountName);
    return data.data;
  } else {
    throw new Error(data.message);
  }
}

// Usage
(async () => {
  const banks = await listBanks();
  // Verify an Access Bank account
  const account = await verifyAccount('044', '0123456789');
  console.log('Verified:', account.accountName);
})();`}
                                />
                            </div>
                        </section>

                        {/* Webhooks */}
                        <section id="webhooks" className="api-docs-section">
                            <h2>Webhooks</h2>
                            <p>
                                Webhooks are used to notify your server of events. We send a <strong>POST</strong> request 
                                to your configured URL when a deposit is received.
                            </p>

                            <div className="info-box">
                                <div className="info-box-icon">
                                    <Shield size={24} />
                                </div>
                                <div className="info-box-content">
                                    <h4>Signature Verification</h4>
                                    <p>Ensure your server validates the <code>X-VTStack-Signature</code> header using your webhook secret to prevent spoofing calls.</p>
                                </div>
                            </div>

                            <CodeBlock 
                                id="webhook-example"
                                code={`{\n  "event": "transaction.deposit",\n  "data": {\n    "reference": "TXN_7726182",\n    "amount": 5000,\n    "currency": "NGN",\n    "customer": { "name": "Hassan Ibrahim" },\n    "timestamp": "2026-03-20T14:30:00Z"\n  }\n}`}
                            />
                        </section>

                        {/* Errors */}
                        <section id="errors" className="api-docs-section">
                            <h2>Errors & Handling</h2>
                            <p>Our API returns standard HTTP status codes. Errors are always returned in a JSON format for easy parsing.</p>
                            
                            <div className="docs-table-wrapper">
                                <table className="docs-table">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Meaning</th>
                                            <th>Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="font-bold text-gray-900">400</td>
                                            <td>Bad Request</td>
                                            <td>Required parameters are missing or invalid.</td>
                                        </tr>
                                        <tr>
                                            <td className="font-bold text-gray-900">401</td>
                                            <td>Unauthorized</td>
                                            <td>Invalid or missing API key.</td>
                                        </tr>
                                        <tr>
                                            <td className="font-bold text-red-600">422</td>
                                            <td>Validation Error</td>
                                            <td>BVN verification failed or duplicate account found.</td>
                                        </tr>
                                        <tr>
                                            <td className="font-bold text-gray-900">429</td>
                                            <td>Too Many Requests</td>
                                            <td>Your platform has exceeded the rate limit.</td>
                                        </tr>
                                        <tr>
                                            <td className="font-bold text-gray-900">500</td>
                                            <td>Server Error</td>
                                            <td>Something went wrong on our end.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Best Practices */}
                        <section id="best-practices" className="api-docs-section">
                            <h2>Best Practices</h2>
                            <div className="grid md:grid-cols-2 gap-8 mt-10">
                                <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary-docs mb-6">
                                        <Lock size={24} />
                                    </div>
                                    <h4 className="font-bold text-gray-900 mb-2">Key Management</h4>
                                    <p className="text-sm text-gray-500 leading-relaxed mb-0">Never hardcode your API keys. Use environment variables and store them in vault systems like Hashicorp Vault or AWS Secrets Manager.</p>
                                </div>
                                <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary-docs mb-6">
                                        <RefreshCcw size={24} />
                                    </div>
                                    <h4 className="font-bold text-gray-900 mb-2">Idempotency</h4>
                                    <p className="text-sm text-gray-500 leading-relaxed mb-0">Always use unique <code>reference</code> strings for account creation to avoid creating duplicate accounts for the same user on retries.</p>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Footer for Docs */}
                    <div className="max-w-7xl mx-auto px-4 py-20 border-t border-gray-100 bg-white">
                        <div className="text-center">
                            <p className="text-gray-400 text-sm font-medium mb-6">Was this documentation helpful?</p>
                            <div className="flex justify-center gap-4">
                                <button className="px-6 py-2 rounded-xl border border-gray-200 text-sm font-bold hover:border-primary-docs hover:text-primary-docs transition-all">Yes</button>
                                <button className="px-6 py-2 rounded-xl border border-gray-200 text-sm font-bold hover:border-primary-docs hover:text-primary-docs transition-all">No</button>
                            </div>
                            <div className="mt-12 pt-12 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-6">
                                <p className="text-xs text-gray-400">© 2026 VTStack Documentation. Powered by VTfree Infrastructure.</p>
                                <div className="flex gap-8">
                                    <Link to="/contact" className="text-xs font-bold text-gray-500 hover:text-primary-docs">Support</Link>
                                    <Link to="/status" className="text-xs font-bold text-gray-500 hover:text-primary-docs">Service Status</Link>
                                    <a href="#" className="text-xs font-bold text-gray-500 hover:text-primary-docs">GitHub API</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};
