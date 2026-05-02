import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, Smartphone, Wallet, Shield, Check, AlertCircle, 
  Clock, ChevronRight, Star, Lock, Info, ArrowRight, RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentMethod {
  id: string;
  type: 'card' | 'mobile_money' | 'wallet';
  last4?: string;
  brand?: string;
  provider?: string;
  isDefault: boolean;
  createdAt: string;
}

interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'withdrawal';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  description: string;
  paymentMethod: string;
  createdAt: string;
  metadata?: {
    orderId?: string;
    productId?: string;
    sellerId?: string;
  };
}

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
}

const paymentProviders = [
  { id: 'stripe', name: 'Stripe', icon: CreditCard, supported: ['card'] },
  { id: 'paystack', name: 'Paystack', icon: Smartphone, supported: ['card', 'mobile_money'] },
  { id: 'flutterwave', name: 'Flutterwave', icon: Wallet, supported: ['card', 'mobile_money', 'wallet'] },
];

const currencies = [
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
];

export function PaymentSystem() {
  const { user, token } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'methods' | 'transactions' | 'withdrawal'>('methods');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('stripe');
  const [selectedCurrency, setSelectedCurrency] = useState('NGN');

  // Load payment data
  useEffect(() => {
    if (token) {
      loadPaymentData();
    }
  }, [token]);

  const loadPaymentData = async () => {
    setLoading(true);
    try {
      const [methodsRes, transactionsRes] = await Promise.all([
        api.getPaymentMethods(token),
        api.getTransactions(token),
      ]);
      
      setPaymentMethods(methodsRes as PaymentMethod[]);
      setTransactions(transactionsRes as Transaction[]);
    } catch (error) {
      console.error('Failed to load payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPaymentMethod = async (paymentData: any) => {
    setProcessing(true);
    try {
      const result = await api.addPaymentMethod(token, paymentData);
      setPaymentMethods(prev => [result as PaymentMethod, ...prev]);
      setShowAddMethod(false);
    } catch (error) {
      console.error('Failed to add payment method:', error);
    } finally {
      setProcessing(false);
    }
  };

  const removePaymentMethod = async (methodId: string) => {
    setProcessing(true);
    try {
      await api.removePaymentMethod(token, methodId);
      setPaymentMethods(prev => prev.filter(m => m.id !== methodId));
    } catch (error) {
      console.error('Failed to remove payment method:', error);
    } finally {
      setProcessing(false);
    }
  };

  const setDefaultPaymentMethod = async (methodId: string) => {
    setProcessing(true);
    try {
      await api.setDefaultPaymentMethod(token, methodId);
      setPaymentMethods(prev => prev.map(m => ({
        ...m,
        isDefault: m.id === methodId
      })));
    } catch (error) {
      console.error('Failed to set default payment method:', error);
    } finally {
      setProcessing(false);
    }
  };

  const processPayment = async (amount: number, paymentMethodId: string, description: string) => {
    setProcessing(true);
    try {
      const paymentIntent = await api.createPaymentIntent(token, {
        amount,
        currency: selectedCurrency,
        paymentMethodId,
        description,
      }) as PaymentIntent;

      // Process payment with Stripe or other provider
      if (selectedProvider === 'stripe') {
        const { stripe } = await import('@stripe/stripe-js');
        const stripeInstance = await stripe('pk_test_...');
        
        const { error } = await stripeInstance.confirmCardPayment(paymentIntent.clientSecret);
        
        if (error) {
          throw new Error(error.message);
        }
      }

      // Refresh transactions
      loadPaymentData();
    } catch (error) {
      console.error('Payment failed:', error);
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const requestWithdrawal = async (amount: number, paymentMethodId: string) => {
    setProcessing(true);
    try {
      await api.requestWithdrawal(token, {
        amount,
        currency: selectedCurrency,
        paymentMethodId,
      });
      
      // Refresh transactions
      loadPaymentData();
    } catch (error) {
      console.error('Withdrawal failed:', error);
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    const currencyInfo = currencies.find(c => c.code === currency);
    const symbol = currencyInfo?.symbol || currency;
    return `${symbol}${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'processing': return 'text-blue-600 bg-blue-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'cancelled': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" />
          Payment Center
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage payment methods, view transactions, and handle withdrawals securely.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'methods', label: 'Payment Methods', icon: CreditCard },
            { id: 'transactions', label: 'Transactions', icon: Clock },
            { id: 'withdrawal', label: 'Withdrawals', icon: ArrowRight },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Payment Methods Tab */}
          {activeTab === 'methods' && (
            <div className="space-y-6">
              {/* Add Payment Method Button */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Your Payment Methods</h3>
                <button
                  onClick={() => setShowAddMethod(true)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Add Method
                </button>
              </div>

              {/* Payment Methods List */}
              <div className="space-y-3">
                {paymentMethods.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No payment methods added yet</p>
                    <p className="text-sm">Add a payment method to start transacting</p>
                  </div>
                ) : (
                  paymentMethods.map((method) => (
                    <motion.div
                      key={method.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {method.type === 'card' && <CreditCard className="w-5 h-5 text-primary" />}
                            {method.type === 'mobile_money' && <Smartphone className="w-5 h-5 text-primary" />}
                            {method.type === 'wallet' && <Wallet className="w-5 h-5 text-primary" />}
                          </div>
                          <div>
                            <div className="font-medium">
                              {method.type === 'card' && `${method.brand} •••• ${method.last4}`}
                              {method.type === 'mobile_money' && method.provider}
                              {method.type === 'wallet' && method.provider}
                            </div>
                            <div className="text-sm text-gray-500">
                              Added {new Date(method.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {method.isDefault && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              Default
                            </span>
                          )}
                          <button
                            onClick={() => setDefaultPaymentMethod(method.id)}
                            className="p-2 text-gray-600 hover:text-primary transition-colors"
                            disabled={method.isDefault || processing}
                          >
                            <Star className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removePaymentMethod(method.id)}
                            className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                            disabled={processing}
                          >
                            <AlertCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Add Payment Method Modal */}
              {showAddMethod && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
                    <h3 className="text-xl font-bold mb-4">Add Payment Method</h3>
                    
                    {/* Provider Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Payment Provider
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {paymentProviders.map((provider) => (
                          <button
                            key={provider.id}
                            onClick={() => setSelectedProvider(provider.id)}
                            className={`p-3 border rounded-lg flex items-center gap-3 transition-colors ${
                              selectedProvider === provider.id
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
                            }`}
                          >
                            <provider.icon className="w-5 h-5" />
                            <div className="text-left">
                              <div className="font-medium">{provider.name}</div>
                              <div className="text-xs text-gray-500">
                                {provider.supported.join(', ')}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Currency Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Currency
                      </label>
                      <select
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {currencies.map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {currency.symbol} {currency.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Payment Form */}
                    <AddPaymentMethodForm
                      provider={selectedProvider}
                      currency={selectedCurrency}
                      onSubmit={addPaymentMethod}
                      onCancel={() => setShowAddMethod(false)}
                      processing={processing}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Transaction History</h3>
                <button
                  onClick={loadPaymentData}
                  className="p-2 text-gray-600 hover:text-primary transition-colors"
                  disabled={processing}
                >
                  <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions yet</p>
                    <p className="text-sm">Your transaction history will appear here</p>
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            transaction.type === 'payment' ? 'bg-red-100' : 
                            transaction.type === 'refund' ? 'bg-green-100' : 'bg-blue-100'
                          }`}>
                            {transaction.type === 'payment' && <ArrowRight className="w-4 h-4 text-red-600" />}
                            {transaction.type === 'refund' && <RefreshCw className="w-4 h-4 text-green-600" />}
                            {transaction.type === 'withdrawal' && <ArrowRight className="w-4 h-4 text-blue-600" />}
                          </div>
                          <div>
                            <div className="font-medium">{transaction.description}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(transaction.createdAt).toLocaleDateString()} • {transaction.paymentMethod}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${
                            transaction.type === 'payment' ? 'text-red-600' : 
                            transaction.type === 'refund' ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            {transaction.type === 'payment' ? '-' : '+'}
                            {formatAmount(transaction.amount, transaction.currency)}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Withdrawal Tab */}
          {activeTab === 'withdrawal' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Request Withdrawal</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Withdraw your earnings to your preferred payment method.
                </p>
              </div>

              <WithdrawalForm
                paymentMethods={paymentMethods}
                currencies={currencies}
                onSubmit={requestWithdrawal}
                processing={processing}
              />

              {/* Withdrawal History */}
              <div>
                <h4 className="font-medium mb-3">Recent Withdrawals</h4>
                <div className="space-y-2">
                  {transactions
                    .filter(t => t.type === 'withdrawal')
                    .slice(0, 5)
                    .map((withdrawal) => (
                      <div
                        key={withdrawal.id}
                        className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{withdrawal.description}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(withdrawal.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-blue-600">
                            {formatAmount(withdrawal.amount, withdrawal.currency)}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(withdrawal.status)}`}>
                            {withdrawal.status}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Secure Payments</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              All payment information is encrypted and processed securely. We never store your card details on our servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add Payment Method Form Component
function AddPaymentMethodForm({ 
  provider, 
  currency, 
  onSubmit, 
  onCancel, 
  processing 
}: {
  provider: string;
  currency: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  processing: boolean;
}) {
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    name: '',
    phone: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const paymentData = {
      provider,
      currency,
      type: 'card',
      ...formData,
    };
    
    onSubmit(paymentData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {provider === 'stripe' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Card Number
            </label>
            <input
              type="text"
              value={formData.cardNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, cardNumber: e.target.value }))}
              placeholder="1234 5678 9012 3456"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expiry Date
              </label>
              <input
                type="text"
                value={formData.expiry}
                onChange={(e) => setFormData(prev => ({ ...prev, expiry: e.target.value }))}
                placeholder="MM/YY"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CVV
              </label>
              <input
                type="text"
                value={formData.cvv}
                onChange={(e) => setFormData(prev => ({ ...prev, cvv: e.target.value }))}
                placeholder="123"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>
        </>
      )}

      {(provider === 'paystack' || provider === 'flutterwave') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+2348000000000"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Cardholder Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="John Doe"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          disabled={processing}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={processing}
        >
          {processing ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Processing...</span>
            </div>
          ) : (
            'Add Payment Method'
          )}
        </button>
      </div>
    </form>
  );
}

// Withdrawal Form Component
function WithdrawalForm({
  paymentMethods,
  currencies,
  onSubmit,
  processing
}: {
  paymentMethods: PaymentMethod[];
  currencies: any[];
  onSubmit: (amount: number, paymentMethodId: string) => void;
  processing: boolean;
}) {
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('NGN');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawalAmount = parseFloat(amount);
    if (withdrawalAmount > 0 && selectedMethod) {
      onSubmit(withdrawalAmount, selectedMethod);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            {currencies.find(c => c.code === selectedCurrency)?.symbol}
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="1"
            className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Currency
        </label>
        <select
          value={selectedCurrency}
          onChange={(e) => setSelectedCurrency(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {currencies.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.symbol} {currency.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Withdrawal Method
        </label>
        <select
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          required
        >
          <option value="">Select withdrawal method</option>
          {paymentMethods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.type === 'card' && `${method.brand} •••• ${method.last4}`}
              {method.type === 'mobile_money' && method.provider}
              {method.type === 'wallet' && method.provider}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={processing || !amount || !selectedMethod}
      >
        {processing ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Processing...</span>
          </div>
        ) : (
          'Request Withdrawal'
        )}
      </button>
    </form>
  );
}
