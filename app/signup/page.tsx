'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp, verifyEmail, resendVerificationCode } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

export default function SignupPage() {
    const router = useRouter()
    const { login } = useAuth()
    const [step, setStep] = useState(1) // 1: Signup, 2: Verification
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'author', // Default to author
        academic_year: '',
        author_type: '',
        author_category: '',
        academic_rank: '',
        qualification: '',
        employment_type: '',
        gender: '',
        date_of_birth: '',
    })
    const [verificationCode, setVerificationCode] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [resendLoading, setResendLoading] = useState(false)
    const [resendSuccess, setResendSuccess] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters')
            setLoading(false)
            return
        }

        try {
            const result = await signUp(formData)

            if (result.success) {
                setStep(2) // Move to verification step
            } else {
                setError(result.error || 'Failed to sign up')
            }
        } catch (err) {
            setError('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const result = await verifyEmail(formData.email, verificationCode)

            if (result.success && result.data?.user) {
                login(result.data.user)
                router.push('/dashboard')
            } else {
                setError(result.error || 'Verification failed')
            }
        } catch (err) {
            setError('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleResendCode = async () => {
        setError('')
        setResendSuccess('')
        setResendLoading(true)

        try {
            const result = await resendVerificationCode(formData.email)

            if (result.success) {
                setResendSuccess('Verification code resent successfully!')
                // Clear success message after 5 seconds
                setTimeout(() => setResendSuccess(''), 5000)
            } else {
                setError(result.error || 'Failed to resend code')
            }
        } catch (err) {
            setError('An unexpected error occurred')
        } finally {
            setResendLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl w-full space-y-6 sm:space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
                <div>
                    <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        {step === 1 ? 'Create your account' : 'Verify your email'}
                    </h2>
                    {step === 1 && (
                        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                            Or{' '}
                            <Link href="/login" className="font-semibold text-red-600 hover:text-red-500 transition-colors">
                                sign in to your existing account
                            </Link>
                        </p>
                    )}
                </div>

                {step === 1 ? (
                    <form className="mt-6 sm:mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        required
                                        className="appearance-none block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 transition-all"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email address</label>
                                    <input
                                        id="email-address"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="appearance-none block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 transition-all"
                                        placeholder="john@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        className="appearance-none block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 transition-all"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                                    <input
                                        id="date_of_birth"
                                        name="date_of_birth"
                                        type="date"
                                        required
                                        className="appearance-none block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 transition-all"
                                        value={formData.date_of_birth}
                                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Author Profile Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="academic_year" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Academic Year</label>
                                        <select
                                            id="academic_year"
                                            name="academic_year"
                                            required
                                            className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 transition-all"
                                            value={formData.academic_year}
                                            onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                                        >
                                            <option value="">Select Year</option>
                                            <option value="2024-2025">2024-2025</option>
                                            <option value="2025-2026">2025-2026</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="author_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Author Type</label>
                                        <select
                                            id="author_type"
                                            name="author_type"
                                            required
                                            className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 transition-all"
                                            value={formData.author_type}
                                            onChange={(e) => setFormData({ ...formData, author_type: e.target.value })}
                                        >
                                            <option value="">Select Type</option>
                                            <option value="FA">FA</option>
                                            <option value="COA">COA</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="author_category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Author Category</label>
                                        <select
                                            id="author_category"
                                            name="author_category"
                                            required
                                            className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 transition-all"
                                            value={formData.author_category}
                                            onChange={(e) => setFormData({ ...formData, author_category: e.target.value })}
                                        >
                                            <option value="">Select Category</option>
                                            <option value="AS">AS</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="academic_rank" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Academic Rank</label>
                                        <select
                                            id="academic_rank"
                                            name="academic_rank"
                                            required
                                            className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 transition-all"
                                            value={formData.academic_rank}
                                            onChange={(e) => setFormData({ ...formData, academic_rank: e.target.value })}
                                        >
                                            <option value="">Select Rank</option>
                                            <option value="GRA-I">GRA-I</option>
                                            <option value="GRA-II">GRA-II</option>
                                            <option value="LEC">LEC</option>
                                            <option value="AST">AST</option>
                                            <option value="ASC">ASC</option>
                                            <option value="PRF">PRF</option>
                                            <option value="AL">AL</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="qualification" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Qualification</label>
                                        <select
                                            id="qualification"
                                            name="qualification"
                                            required
                                            className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 transition-all"
                                            value={formData.qualification}
                                            onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                                        >
                                            <option value="">Select Qualification</option>
                                            <option value="MST">MST</option>
                                            <option value="PHD">PHD</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="employment_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employment Type</label>
                                        <select
                                            id="employment_type"
                                            name="employment_type"
                                            required
                                            className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 transition-all"
                                            value={formData.employment_type}
                                            onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                                        >
                                            <option value="">Select Type</option>
                                            <option value="FT">FT</option>
                                            <option value="JAEI">JAEI</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                                        <select
                                            id="gender"
                                            name="gender"
                                            required
                                            className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent sm:text-sm bg-white dark:bg-gray-700 transition-all"
                                            value={formData.gender}
                                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="Female">Female</option>
                                            <option value="Male">Male</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-600 text-sm font-medium text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30 animate-shake">
                                {error}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]"
                            >
                                {loading ? (
                                    <div className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Signing up...
                                    </div>
                                ) : 'Create Account'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form className="mt-6 sm:mt-8 space-y-6" onSubmit={handleVerify}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-center">Verification Code</label>
                                <input
                                    id="code"
                                    name="code"
                                    type="text"
                                    required
                                    className="appearance-none block w-full px-3 py-4 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-center text-2xl font-bold tracking-[0.5em] bg-white dark:bg-gray-700 transition-all"
                                    placeholder="00000000"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    maxLength={12}
                                />
                            </div>
                        </div>

                        <div className="text-sm text-center text-gray-600 dark:text-gray-400">
                            We've sent a verification code to <br />
                            <span className="font-bold text-gray-900 dark:text-white">{formData.email}</span>
                        </div>

                        {error && (
                            <div className="text-red-600 text-sm font-medium text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                                {error}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]"
                            >
                                {loading ? 'Verifying...' : 'Verify Email'}
                            </button>
                        </div>

                        <div className="flex flex-col items-center space-y-4">
                            <button
                                type="button"
                                onClick={handleResendCode}
                                disabled={resendLoading || loading}
                                className="text-sm font-semibold text-red-600 hover:text-red-500 disabled:opacity-50 transition-colors"
                            >
                                {resendLoading ? 'Resending...' : "Didn't receive the code? Resend Code"}
                            </button>

                            {resendSuccess && (
                                <div className="text-green-600 text-sm font-medium bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg border border-green-100 dark:border-green-900/30 animate-fade-in">
                                    {resendSuccess}
                                </div>
                            )}
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
