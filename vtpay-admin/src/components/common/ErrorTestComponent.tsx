import React from 'react';

// Test component that throws an error
const ErrorTestComponent: React.FC = () => {
    const [shouldError, setShouldError] = React.useState(false);

    if (shouldError) {
        throw new Error('Test error: ErrorBoundary is working!');
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">ErrorBoundary Test Page</h1>
            <p className="mb-4">Click the button below to trigger an error and test the ErrorBoundary:</p>
            <button
                onClick={() => setShouldError(true)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
                Trigger Error
            </button>
        </div>
    );
};

export default ErrorTestComponent;
