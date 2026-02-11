import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Button } from '../../components/Button';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export const VerifyEmail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your email...');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link.');
            return;
        }

        const verifyEmail = async () => {
            try {
                await api.get(`/auth/verify-email?token=${token}`);
                setStatus('success');
                setMessage('Your email has been successfully verified.');
            } catch (error: any) {
                console.error('Verification error:', error);
                setStatus('error');
                setMessage(error.response?.data?.message || 'Failed to verify email. The link may be expired.');
            }
        };

        verifyEmail();
    }, [token]);

    return (
        <div className="card animate-slide-up" style={{ maxWidth: '32rem', margin: '2rem auto', padding: '2rem', textAlign: 'center' }}>
            <div className="mb-6 flex justify-center">
                {status === 'loading' && (
                    <div className="text-blue-500 animate-spin">
                        <Loader size={48} />
                    </div>
                )}
                {status === 'success' && (
                    <div className="bg-green-100 p-4 rounded-full">
                        <CheckCircle size={48} className="text-green-600" />
                    </div>
                )}
                {status === 'error' && (
                    <div className="bg-red-100 p-4 rounded-full">
                        <XCircle size={48} className="text-red-600" />
                    </div>
                )}
            </div>

            <h2 className="text-2xl font-bold mb-4">
                {status === 'loading' && 'Verifying Email'}
                {status === 'success' && 'Email Verified!'}
                {status === 'error' && 'Verification Failed'}
            </h2>

            <p className="mb-8 text-gray-600">{message}</p>

            {status !== 'loading' && (
                <Button onClick={() => navigate('/login')} fullWidth>
                    Go to Login
                </Button>
            )}
        </div>
    );
};
