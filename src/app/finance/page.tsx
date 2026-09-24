'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Wallet, DollarSign, TrendingUp, TrendingDown, Clock, UserCheck,
  Plus, Search, Filter, Trash2, Check, CheckCircle2, ArrowUpRight,
  PieChart as PieChartIcon, BarChart3, Calendar, Layers, ShieldCheck,
  AlertCircle, ChevronRight, X, User, ArrowDownRight, Pencil, Sliders
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import {
  FinanceTransaction, CommittedIncomeRecord, MoneyLentRecord, FinanceSummary
} from '@/types/finance';
import {
  getFinanceTransactions, createFinanceTransaction, updateFinanceTransaction, deleteFinanceTransaction,
  getCommittedIncomes, createCommittedIncome, updateCommittedIncome, deleteCommittedIncome, markCommittedIncomeReceived,
  getMoneyLentRecords, createMoneyLentRecord, updateMoneyLentRecord, deleteMoneyLentRecord, recordLendRepayment,
  getFinanceSummary
} from '@/lib/api';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell, PieChart, Pie
} from 'recharts';

const TRANSACTION_CATEGORIES = {
  income: ['Salary', 'Freelance', 'Client Work', 'Investments', 'Gift', 'Initial / Balance Adjustment', 'Other Income'],
  expense: ['Food & Dining', 'Tools & Software', 'Rent & Utilities', 'Shopping', 'Travel', 'Health & Fitness', 'Entertainment', 'Personal', 'Initial / Balance Adjustment', 'Other Expense'],
};

const PAYMENT_METHODS = [
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'upi', label: 'UPI' },
  { id: 'cash', label: 'Cash' },
  { id: 'credit_card', label: 'Credit Card' },
  { id: 'debit_card', label: 'Debit Card' },
  { id: 'paypal', label: 'PayPal' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'other', label: 'Other' },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Salary': '#10b981',
  'Freelance': '#06b6d4',
  'Client Work': '#8b5cf6',
  'Investments': '#f59e0b',
  'Gift': '#ec4899',
  'Other Income': '#3b82f6',
  'Food & Dining': '#ef4444',
  'Tools & Software': '#8b5cf6',
  'Rent & Utilities': '#ea580c',
  'Shopping': '#ec4899',
  'Travel': '#06b6d4',
  'Health & Fitness': '#10b981',
  'Entertainment': '#f59e0b',
  'Personal': '#6b7280',
  'Initial / Balance Adjustment': '#6366f1',
  'Other Expense': '#94a3b8',
};

export default function FinanceTrackerPage() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'committed' | 'lent' | 'analytics'>('transactions');

  // Data states
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [committedIncomes, setCommittedIncomes] = useState<CommittedIncomeRecord[]>([]);
  const [moneyLentRecords, setMoneyLentRecords] = useState<MoneyLentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  // Modal & Edit States
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);

  const [showCommittedModal, setShowCommittedModal] = useState(false);
  const [editingCommitted, setEditingCommitted] = useState<CommittedIncomeRecord | null>(null);

  const [showLentModal, setShowLentModal] = useState(false);
  const [editingLent, setEditingLent] = useState<MoneyLentRecord | null>(null);

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [targetBalanceInput, setTargetBalanceInput] = useState('');

  const [repayModalItem, setRepayModalItem] = useState<MoneyLentRecord | null>(null);
  const [repayAmountInput, setRepayAmountInput] = useState('');

  // Form states
  const [txForm, setTxForm] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    category: 'Client Work',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    paymentMethod: 'bank_transfer',
  });

  const [committedForm, setCommittedForm] = useState({
    clientName: '',
    projectTitle: '',
    amount: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const [lentForm, setLentForm] = useState({
    borrowerName: '',
    amount: '',
    dateLent: format(new Date(), 'yyyy-MM-dd'),
    expectedReturnDate: '',
    notes: '',
  });

  // Load all finance data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [txs, committed, lent] = await Promise.all([
        getFinanceTransactions(),
        getCommittedIncomes(),
        getMoneyLentRecords(),
      ]);
      setTransactions(txs || []);
      setCommittedIncomes(committed || []);
      setMoneyLentRecords(lent || []);
    } catch (err) {
      console.error('[FinanceTracker] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Calculate Key Summary Metrics
  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
      if (t.type === 'income') totalIncome += t.amount;
      else if (t.type === 'expense') totalExpense += t.amount;
    });

    const netBalance = totalIncome - totalExpense;

    const pendingCommitted = committedIncomes.filter(c => c.status === 'pending');
    const totalCommittedIncome = pendingCommitted.reduce((acc, c) => acc + c.amount, 0);

    const pendingLent = moneyLentRecords.filter(m => m.status !== 'repaid');
    const totalMoneyLentOutstanding = pendingLent.reduce((acc, m) => acc + (m.amount - (m.repaidAmount || 0)), 0);

    const projectedWealth = netBalance + totalCommittedIncome + totalMoneyLentOutstanding;

    return {
      totalIncome,
      totalExpense,
      netBalance,
      totalCommittedIncome,
      totalMoneyLentOutstanding,
      projectedWealth,
      pendingCommittedCount: pendingCommitted.length,
      outstandingLentCount: pendingLent.length,
    };
  }, [transactions, committedIncomes, moneyLentRecords]);

  // Handlers for Transactions
  const openNewTxModal = () => {
    setEditingTx(null);
    setTxForm({
      type: 'income',
      amount: '',
      category: 'Client Work',
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      paymentMethod: 'bank_transfer',
    });
    setShowTxModal(true);
  };

  const handleEditTx = (tx: FinanceTransaction) => {
    setEditingTx(tx);
    setTxForm({
      type: tx.type,
      amount: String(tx.amount),
      category: tx.category,
      date: format(new Date(tx.date), 'yyyy-MM-dd'),
      description: tx.description || '',
      paymentMethod: tx.paymentMethod || 'bank_transfer',
    });
    setShowTxModal(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.amount || Number(txForm.amount) <= 0) return;

    const payload = {
      type: txForm.type,
      amount: Number(txForm.amount),
      category: txForm.category,
      date: txForm.date ? new Date(txForm.date).toISOString() : new Date().toISOString(),
      description: txForm.description,
      paymentMethod: txForm.paymentMethod as FinanceTransaction['paymentMethod'],
    };

    if (editingTx) {
      await updateFinanceTransaction(editingTx.id, payload);
    } else {
      await createFinanceTransaction(payload);
    }

    setShowTxModal(false);
    setEditingTx(null);
    setTxForm({
      type: 'income',
      amount: '',
      category: 'Client Work',
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      paymentMethod: 'bank_transfer',
    });
    loadAllData();
  };

  const handleDeleteTx = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    await deleteFinanceTransaction(id);
    loadAllData();
  };

  // Handlers for Manual Net Balance Adjustment
  const openAdjustBalanceModal = () => {
    setTargetBalanceInput(String(summary.netBalance));
    setShowAdjustModal(true);
  };

  const handleAdjustBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetBalanceInput === '') return;

    const target = Number(targetBalanceInput);
    const diff = target - summary.netBalance;

    if (diff !== 0) {
      await createFinanceTransaction({
        type: diff > 0 ? 'income' : 'expense',
        amount: Math.abs(diff),
        category: 'Initial / Balance Adjustment',
        date: new Date().toISOString(),
        description: `Manual Net Balance adjustment to set Net Current Balance to ₹${target.toLocaleString()}`,
        paymentMethod: 'other',
      });
      loadAllData();
    }
    setShowAdjustModal(false);
  };

  // Handlers for Committed Client Income
  const openNewCommittedModal = () => {
    setEditingCommitted(null);
    setCommittedForm({
      clientName: '',
      projectTitle: '',
      amount: '',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
    setShowCommittedModal(true);
  };

  const handleEditCommitted = (item: CommittedIncomeRecord) => {
    setEditingCommitted(item);
    setCommittedForm({
      clientName: item.clientName,
      projectTitle: item.projectTitle,
      amount: String(item.amount),
      dueDate: format(new Date(item.dueDate), 'yyyy-MM-dd'),
      notes: item.notes || '',
    });
    setShowCommittedModal(true);
  };

  const handleSaveCommitted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!committedForm.clientName || !committedForm.amount || Number(committedForm.amount) <= 0) return;

    const payload = {
      clientName: committedForm.clientName,
      projectTitle: committedForm.projectTitle || 'Project Milestone',
      amount: Number(committedForm.amount),
      dueDate: committedForm.dueDate ? new Date(committedForm.dueDate).toISOString() : new Date().toISOString(),
      status: editingCommitted ? editingCommitted.status : 'pending',
      notes: committedForm.notes,
    };

    if (editingCommitted) {
      await updateCommittedIncome(editingCommitted.id, payload);
    } else {
      await createCommittedIncome(payload);
    }

    setShowCommittedModal(false);
    setEditingCommitted(null);
    setCommittedForm({
      clientName: '',
      projectTitle: '',
      amount: '',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
    loadAllData();
  };

  const handleMarkReceived = async (id: string) => {
    if (!confirm('Mark this committed payment as received? It will automatically record an Income transaction!')) return;
    await markCommittedIncomeReceived(id);
    loadAllData();
  };

  const handleDeleteCommitted = async (id: string) => {
    if (!confirm('Delete this committed income entry?')) return;
    await deleteCommittedIncome(id);
    loadAllData();
  };

  // Handlers for Money Lent
  const openNewLentModal = () => {
    setEditingLent(null);
    setLentForm({
      borrowerName: '',
      amount: '',
      dateLent: format(new Date(), 'yyyy-MM-dd'),
      expectedReturnDate: '',
      notes: '',
    });
    setShowLentModal(true);
  };

  const handleEditLent = (item: MoneyLentRecord) => {
    setEditingLent(item);
    setLentForm({
      borrowerName: item.borrowerName,
      amount: String(item.amount),
      dateLent: format(new Date(item.dateLent), 'yyyy-MM-dd'),
      expectedReturnDate: item.expectedReturnDate ? format(new Date(item.expectedReturnDate), 'yyyy-MM-dd') : '',
      notes: item.notes || '',
    });
    setShowLentModal(true);
  };

  const handleSaveLent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lentForm.borrowerName || !lentForm.amount || Number(lentForm.amount) <= 0) return;

    const payload = {
      borrowerName: lentForm.borrowerName,
      amount: Number(lentForm.amount),
      dateLent: lentForm.dateLent ? new Date(lentForm.dateLent).toISOString() : new Date().toISOString(),
      expectedReturnDate: lentForm.expectedReturnDate ? new Date(lentForm.expectedReturnDate).toISOString() : undefined,
      repaidAmount: editingLent ? editingLent.repaidAmount : 0,
      status: editingLent ? editingLent.status : 'pending',
      notes: lentForm.notes,
    };

    if (editingLent) {
      await updateMoneyLentRecord(editingLent.id, payload);
    } else {
      await createMoneyLentRecord(payload);
    }

    setShowLentModal(false);
    setEditingLent(null);
    setLentForm({
      borrowerName: '',
      amount: '',
      dateLent: format(new Date(), 'yyyy-MM-dd'),
      expectedReturnDate: '',
      notes: '',
    });
    loadAllData();
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayModalItem || !repayAmountInput || Number(repayAmountInput) <= 0) return;

    await recordLendRepayment(repayModalItem.id, Number(repayAmountInput));
    setRepayModalItem(null);
    setRepayAmountInput('');
    loadAllData();
  };

  const handleDeleteLent = async (id: string) => {
    if (!confirm('Delete this money lent record?')) return;
    await deleteMoneyLentRecord(id);
    loadAllData();
  };

  // Filtered lists
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesType = txTypeFilter === 'all' || t.type === txTypeFilter;
      if (!matchesType) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.category.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.paymentMethod.toLowerCase().includes(q)
      );
    });
  }, [transactions, txTypeFilter, searchQuery]);

  // Analytics Chart Data
  const chartCategoryData = useMemo(() => {
    const expenseMap: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      expenseMap[t.category] = (expenseMap[t.category] || 0) + t.amount;
    });
    return Object.entries(expenseMap).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const chartMonthlyData = useMemo(() => {
    const monthlyMap: Record<string, { income: number; expense: number }> = {};

    transactions.forEach(t => {
      const monthKey = format(new Date(t.date), 'MMM yyyy');
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { income: 0, expense: 0 };
      if (t.type === 'income') monthlyMap[monthKey].income += t.amount;
      else if (t.type === 'expense') monthlyMap[monthKey].expense += t.amount;
    });

    return Object.entries(monthlyMap).map(([month, val]) => ({
      month,
      Income: val.income,
      Expense: val.expense,
      Net: val.income - val.expense,
    }));
  }, [transactions]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16, marginBottom: 24
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
            }}>
              <Wallet size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>Finance & Net Worth Tracker</h1>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Track Income, Expenses, Committed Client Revenue & Lendings</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={openAdjustBalanceModal} style={{ gap: 6 }}>
            <Sliders size={15} color="#10b981" /> Set Net Balance
          </button>
          <button className="btn btn-secondary btn-sm" onClick={openNewCommittedModal} style={{ gap: 6 }}>
            <Clock size={15} color="#8b5cf6" /> + Committed Income
          </button>
          <button className="btn btn-secondary btn-sm" onClick={openNewLentModal} style={{ gap: 6 }}>
            <UserCheck size={15} color="#06b6d4" /> + Log Money Lent
          </button>
          <button className="btn btn-primary btn-sm" onClick={openNewTxModal} style={{ gap: 6 }}>
            <Plus size={16} /> New Transaction
          </button>
        </div>
      </div>

      {/* ── TOP FINANCIAL OVERVIEW CARDS ──────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        {/* Card 1: Net Balance */}
        <div className="stat-card" style={{
          background: summary.netBalance >= 0
            ? 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(16,185,129,0.03))'
            : 'linear-gradient(135deg, rgba(239,68,68,0.14), rgba(239,68,68,0.03))',
          border: `1px solid ${summary.netBalance >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>NET CURRENT BALANCE</span>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: summary.netBalance >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
              color: summary.netBalance >= 0 ? '#10b981' : '#ef4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: summary.netBalance >= 0 ? '#10b981' : '#ef4444' }}>
            ₹{summary.netBalance.toLocaleString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Income (₹{summary.totalIncome.toLocaleString()}) - Expenses (₹{summary.totalExpense.toLocaleString()})
            </span>
            <button
              onClick={openAdjustBalanceModal}
              style={{
                fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, padding: '2px 7px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <Sliders size={11} /> Set Balance
            </button>
          </div>
        </div>

        {/* Card 2: Committed Client Income */}
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(139,92,246,0.03))', border: '1px solid rgba(139,92,246,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6' }}>COMMITTED CLIENT REVENUE</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.2)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={17} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
            ₹{summary.totalCommittedIncome.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {summary.pendingCommittedCount} pending client milestone contracts
          </div>
        </div>

        {/* Card 3: Money Lent (Receivables) */}
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(6,186,212,0.12), rgba(6,186,212,0.03))', border: '1px solid rgba(6,186,212,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#06b6d4' }}>OUTSTANDING MONEY LENT</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(6,186,212,0.2)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={17} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
            ₹{summary.totalMoneyLentOutstanding.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {summary.outstandingLentCount} active borrower accounts
          </div>
        </div>

        {/* Card 4: Total Projected Net Worth */}
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.04))', border: '1px solid rgba(245,158,11,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>PROJECTED TOTAL WEALTH</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={17} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>
            ₹{summary.projectedWealth.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Balance + Committed Revenue + Money Lent
          </div>
        </div>
      </div>

      {/* ── NAVIGATION TABS BAR ──────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)',
        marginBottom: 20, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4
      }}>
        {[
          { id: 'transactions', label: `💳 Transactions (${transactions.length})` },
          { id: 'committed', label: `💼 Committed Client Revenue (${committedIncomes.length})` },
          { id: 'lent', label: `🤝 Money Lent (${moneyLentRecords.length})` },
          { id: 'analytics', label: `📊 Financial Analytics` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as typeof activeTab)}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: 'none',
              background: activeTab === t.id ? 'var(--bg-card-hover)' : 'transparent',
              color: activeTab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === t.id ? 700 : 500,
              fontSize: 14,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              borderBottom: activeTab === t.id ? '2px solid #10b981' : '2px solid transparent',
              transition: 'all 0.2s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: TRANSACTIONS ──────────────────────────────────── */}
      {activeTab === 'transactions' && (
        <div>
          {/* Controls Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
              <input
                className="input"
                placeholder="Search category, description..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 38, height: 38, borderRadius: 10, fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {['all', 'income', 'expense'].map(t => (
                <button
                  key={t}
                  onClick={() => setTxTypeFilter(t as typeof txTypeFilter)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', textTransform: 'capitalize',
                    background: txTypeFilter === t ? 'var(--bg-card-hover)' : 'transparent',
                    color: txTypeFilter === t ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: txTypeFilter === t ? '1px solid var(--border)' : '1px solid transparent'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          {filteredTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 16, border: '1px dashed var(--border)' }}>
              <DollarSign size={40} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: 10 }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>No transactions logged yet</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Click "+ New Transaction" above to add your first income or expense.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredTransactions.map(tx => (
                <div key={tx.id} style={{
                  padding: '14px 18px', borderRadius: 14, background: 'var(--bg-card)',
                  border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: tx.type === 'income' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: tx.type === 'income' ? '#10b981' : '#ef4444',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {tx.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{tx.category}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--bg-card-hover)', padding: '2px 7px', borderRadius: 6, color: 'var(--text-muted)' }}>
                          {tx.paymentMethod.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {tx.description || 'No description'} • {format(new Date(tx.date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{
                      fontSize: 18, fontWeight: 800,
                      color: tx.type === 'income' ? '#10b981' : '#ef4444'
                    }}>
                      {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                    </span>

                    <button
                      onClick={() => handleEditTx(tx)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: 6, color: 'var(--text-muted)' }}
                      title="Edit transaction"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      onClick={() => handleDeleteTx(tx.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: 6, color: '#ef4444' }}
                      title="Delete transaction"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: COMMITTED CLIENT REVENUE ─────────────────────── */}
      {activeTab === 'committed' && (
        <div>
          <div style={{
            padding: '14px 18px', borderRadius: 14, background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.25)', marginBottom: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#8b5cf6' }}>💼 Committed Client Incomes</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                Agreed client milestones & project commitments. When a payment is received, click "Mark Received" to convert it into actual Income!
              </div>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#8b5cf6' }}>
              Total: ${summary.totalCommittedIncome.toLocaleString()}
            </span>
          </div>

          {committedIncomes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 16, border: '1px dashed var(--border)' }}>
              <Clock size={40} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: 10 }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>No committed client incomes recorded</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Click "+ Committed Income" to record future client milestone payments.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: 14 }}>
              {committedIncomes.map(item => {
                const isOverdue = item.status === 'pending' && isPast(new Date(item.dueDate)) && !isToday(new Date(item.dueDate));
                return (
                  <div key={item.id} style={{
                    padding: '16px 18px', borderRadius: 16, background: 'var(--bg-card)',
                    border: isOverdue ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', gap: 10
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{item.clientName}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        background: item.status === 'received' ? 'rgba(16,185,129,0.15)' : isOverdue ? 'rgba(239,68,68,0.15)' : 'rgba(139,92,246,0.15)',
                        color: item.status === 'received' ? '#10b981' : isOverdue ? '#ef4444' : '#8b5cf6'
                      }}>
                        {item.status === 'received' ? '✓ Received' : isOverdue ? '⚠️ Overdue' : '⏳ Pending'}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Project: {item.projectTitle}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: '#8b5cf6' }}>
                        ₹{item.amount.toLocaleString()}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Due: {format(new Date(item.dueDate), 'MMM d, yyyy')}
                      </span>
                    </div>

                    {item.notes && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 8 }}>
                        {item.notes}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      {item.status === 'pending' && (
                        <button
                          onClick={() => handleMarkReceived(item.id)}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, padding: '6px', fontSize: 12 }}
                        >
                          <Check size={14} /> Mark as Received
                        </button>
                      )}
                      <button
                        onClick={() => handleEditCommitted(item)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 10px' }}
                        title="Edit record"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        onClick={() => handleDeleteCommitted(item.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 10px', color: '#ef4444' }}
                        title="Delete record"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: MONEY LENT ───────────────────────────────────── */}
      {activeTab === 'lent' && (
        <div>
          <div style={{
            padding: '14px 18px', borderRadius: 14, background: 'rgba(6,186,212,0.1)',
            border: '1px solid rgba(6,186,212,0.25)', marginBottom: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#06b6d4' }}>🤝 Money Given / Lent Tracker</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                Track money lent to individuals, return deadlines, and record partial/full repayments.
              </div>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#06b6d4' }}>
              Total Outstanding: ${summary.totalMoneyLentOutstanding.toLocaleString()}
            </span>
          </div>

          {moneyLentRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 16, border: '1px dashed var(--border)' }}>
              <UserCheck size={40} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: 10 }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>No money lent records logged</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Click "+ Log Money Lent" to record money given to someone.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: 14 }}>
              {moneyLentRecords.map(item => {
                const outstanding = item.amount - (item.repaidAmount || 0);
                const progressPct = Math.round(((item.repaidAmount || 0) / item.amount) * 100);
                return (
                  <div key={item.id} style={{
                    padding: '16px 18px', borderRadius: 16, background: 'var(--bg-card)',
                    border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{item.borrowerName}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        background: item.status === 'repaid' ? 'rgba(16,185,129,0.15)' : item.status === 'partially_paid' ? 'rgba(245,158,11,0.15)' : 'rgba(6,186,212,0.15)',
                        color: item.status === 'repaid' ? '#10b981' : item.status === 'partially_paid' ? '#f59e0b' : '#06b6d4'
                      }}>
                        {item.status === 'repaid' ? '✓ Fully Repaid' : item.status === 'partially_paid' ? '⏳ Partial' : '🔴 Outstanding'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                      <div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Original Lent</span>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>₹{item.amount.toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Outstanding</span>
                        <div style={{ fontSize: 16, fontWeight: 800, color: outstanding > 0 ? '#ef4444' : '#10b981' }}>₹{outstanding.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: 6, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                      <div style={{ width: `${progressPct}%`, height: '100%', background: '#10b981', borderRadius: 4 }} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                      <span>Lent: {format(new Date(item.dateLent), 'MMM d, yyyy')}</span>
                      <span>{item.expectedReturnDate ? `Return: ${format(new Date(item.expectedReturnDate), 'MMM d, yyyy')}` : ''}</span>
                    </div>

                    {item.notes && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 8 }}>
                        {item.notes}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      {item.status !== 'repaid' && (
                        <button
                          onClick={() => { setRepayModalItem(item); setRepayAmountInput(''); }}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, padding: '6px', fontSize: 12 }}
                        >
                          <DollarSign size={14} /> Record Repayment
                        </button>
                      )}
                      <button
                        onClick={() => handleEditLent(item)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 10px' }}
                        title="Edit record"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        onClick={() => handleDeleteLent(item.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 10px', color: '#ef4444' }}
                        title="Delete record"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: FINANCIAL ANALYTICS ──────────────────────────── */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: 20 }}>
            {/* Chart 1: Monthly Cash Flow */}
            <div style={{ padding: '20px 22px', borderRadius: 18, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Monthly Income vs Expenses</h3>
              {chartMonthlyData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>No transaction data to render chart</div>
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartMonthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} />
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }} />
                      <Legend />
                      <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 2: Expenses Category Breakdown */}
            <div style={{ padding: '20px 22px', borderRadius: 18, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Expenses Category Breakdown</h3>
              {chartCategoryData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>No expense category data logged yet</div>
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}>
                        {chartCategoryData.map((entry, idx) => (
                          <Cell key={idx} fill={CATEGORY_COLORS[entry.name] || '#8b5cf6'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1: ADD / EDIT TRANSACTION ────────────────────── */}
      {showTxModal && (
        <div className="modal-backdrop" onClick={() => setShowTxModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {editingTx ? '✏️ Edit Payment Transaction' : '➕ Record New Transaction'}
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowTxModal(false)} style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Type Switcher */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setTxForm({ ...txForm, type: 'income', category: 'Client Work' })}
                  style={{
                    padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    background: txForm.type === 'income' ? 'rgba(16,185,129,0.2)' : 'var(--bg-secondary)',
                    color: txForm.type === 'income' ? '#10b981' : 'var(--text-muted)',
                    border: txForm.type === 'income' ? '1px solid #10b981' : '1px solid var(--border)'
                  }}
                >
                  + Income
                </button>
                <button
                  type="button"
                  onClick={() => setTxForm({ ...txForm, type: 'expense', category: 'Food & Dining' })}
                  style={{
                    padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    background: txForm.type === 'expense' ? 'rgba(239,68,68,0.2)' : 'var(--bg-secondary)',
                    color: txForm.type === 'expense' ? '#ef4444' : 'var(--text-muted)',
                    border: txForm.type === 'expense' ? '1px solid #ef4444' : '1px solid var(--border)'
                  }}
                >
                  - Expense
                </button>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input"
                  placeholder="0.00"
                  value={txForm.amount}
                  onChange={e => setTxForm({ ...txForm, amount: e.target.value })}
                  style={{ width: '100%', height: 42, borderRadius: 10 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Category</label>
                <select
                  className="input"
                  value={txForm.category}
                  onChange={e => setTxForm({ ...txForm, category: e.target.value })}
                  style={{ width: '100%', height: 42, borderRadius: 10 }}
                >
                  {TRANSACTION_CATEGORIES[txForm.type].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Payment Method</label>
                <select
                  className="input"
                  value={txForm.paymentMethod}
                  onChange={e => setTxForm({ ...txForm, paymentMethod: e.target.value })}
                  style={{ width: '100%', height: 42, borderRadius: 10 }}
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Date</label>
                <input
                  type="date"
                  className="input"
                  value={txForm.date}
                  onChange={e => setTxForm({ ...txForm, date: e.target.value })}
                  style={{ width: '100%', height: 42, borderRadius: 10 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Description / Note</label>
                <input
                  className="input"
                  placeholder="Optional description..."
                  value={txForm.description}
                  onChange={e => setTxForm({ ...txForm, description: e.target.value })}
                  style={{ width: '100%', height: 42, borderRadius: 10 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowTxModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingTx ? 'Update Transaction' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ADD / EDIT COMMITTED CLIENT INCOME ────────── */}
      {showCommittedModal && (
        <div className="modal-backdrop" onClick={() => setShowCommittedModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {editingCommitted ? '✏️ Edit Committed Client Income' : '💼 New Committed Client Income'}
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCommittedModal(false)} style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCommitted} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Client / Company Name</label>
                <input
                  required
                  className="input"
                  placeholder="e.g. Acme Corp"
                  value={committedForm.clientName}
                  onChange={e => setCommittedForm({ ...committedForm, clientName: e.target.value })}
                  style={{ width: '100%', height: 42, borderRadius: 10 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Project Title / Milestone</label>
                <input
                  required
                  className="input"
                  placeholder="e.g. Website Redesign Milestone 2"
                  value={committedForm.projectTitle}
                  onChange={e => setCommittedForm({ ...committedForm, projectTitle: e.target.value })}
                  style={{ width: '100%', height: 42, borderRadius: 10 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Committed Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input"
                  placeholder="0.00"
                  value={committedForm.amount}
                  onChange={e => setCommittedForm({ ...committedForm, amount: e.target.value })}
                  style={{ width: '100%', height: 42, borderRadius: 10 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Expected Due Date</label>
                <input
                  type="date"
                  required
                  className="input"
                  value={committedForm.dueDate}
                  onChange={e => setCommittedForm({ ...committedForm, dueDate: e.target.value })}
                  style={{ width: '100%', height: 42, borderRadius: 10 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes</label>
                <input
                  className="input"
                  placeholder="Optional notes or invoice status..."
                  value={committedForm.notes}
                  onChange={e => setCommittedForm({ ...committedForm, notes: e.target.value })}
                  style={{ width: '100%', height: 42, borderRadius: 10 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCommittedModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Commitment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: LOG / EDIT MONEY LENT ──────────────────────── */}
      {showLentModal && (
        <div className="modal-backdrop" onClick={() => setShowLentModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {editingLent ? '✏️ Edit Money Lent Record' : '🤝 Log Money Lent'}
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowLentModal(false)} style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveLent} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Borrower Person Name</label>
                <input
                  required
                  className="input"
                  placeholder="e.g. John Doe"
                  value={lentForm.borrowerName}
                  onChange={e => setLentForm({ ...lentForm, borrowerName: e.target.value })}
                  style={{ width: '100%', height: 42, borderRadius: 10 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Lent Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input"
                  placeholder="0.00"
                  value={lentForm.amount}
                  onChange={e => setLentForm({ ...lentForm, amount: e.target.value })}
                  style={{ width: '100%', height: 42, borderRadius: 10 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Date Lent</label>
                <input
                  type="date"
                  className="input"
                  value={lentForm.dateLent}
                  onChange={e => setLentForm({ ...lentForm, dateLent: e.target.value })}
                  style={{ width: '100%', height: 42, borderRadius: 10 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Expected Return Date</label>
                <input
                  type="date"
                  className="input"
                  value={lentForm.expectedReturnDate}
                  onChange={e => setLentForm({ ...lentForm, expectedReturnDate: e.target.value })}
                  style={{ width: '100%', height: 42, borderRadius: 10 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes</label>
                <input
                  className="input"
                  placeholder="Optional notes..."
                  value={lentForm.notes}
                  onChange={e => setLentForm({ ...lentForm, notes: e.target.value })}
                  style={{ width: '100%', height: 42, borderRadius: 10 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowLentModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: RECORD LEND REPAYMENT ──────────────────────── */}
      {repayModalItem && (
        <div className="modal-backdrop" onClick={() => setRepayModalItem(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Record Repayment</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setRepayModalItem(null)} style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Borrower: {repayModalItem.borrowerName}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Outstanding Amount: ₹{ (repayModalItem.amount - (repayModalItem.repaidAmount || 0)).toLocaleString() }
              </div>
            </div>

            <form onSubmit={handleRepaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Repayment Amount Received (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input"
                  placeholder="0.00"
                  value={repayAmountInput}
                  onChange={e => setRepayAmountInput(e.target.value)}
                  style={{ width: '100%', height: 42, borderRadius: 10 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setRepayModalItem(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Repayment</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── MODAL 5: ADJUST / SET NET CURRENT BALANCE ──────────── */}
      {showAdjustModal && (
        <div className="modal-backdrop" onClick={() => setShowAdjustModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Set Net Current Balance</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAdjustModal(false)} style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Current Net Balance</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: summary.netBalance >= 0 ? '#10b981' : '#ef4444', marginTop: 2 }}>
                ₹{summary.netBalance.toLocaleString()}
              </div>
            </div>

            <form onSubmit={handleAdjustBalanceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  New / Target Net Balance (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input"
                  placeholder="e.g. 50000"
                  value={targetBalanceInput}
                  onChange={e => setTargetBalanceInput(e.target.value)}
                  style={{ width: '100%', height: 42, borderRadius: 10 }}
                />
              </div>

              {targetBalanceInput !== '' && !isNaN(Number(targetBalanceInput)) && (
                <div style={{ fontSize: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  {Number(targetBalanceInput) - summary.netBalance > 0 ? (
                    <span style={{ color: '#10b981', fontWeight: 600 }}>
                      ▲ Logs an Income adjustment of +₹{(Number(targetBalanceInput) - summary.netBalance).toLocaleString()}
                    </span>
                  ) : Number(targetBalanceInput) - summary.netBalance < 0 ? (
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>
                      ▼ Logs an Expense adjustment of -₹{Math.abs(Number(targetBalanceInput) - summary.netBalance).toLocaleString()}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>No change in net balance.</span>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAdjustModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Update Net Balance</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
