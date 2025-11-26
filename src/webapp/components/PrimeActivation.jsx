import React, { useState, useEffect } from 'react';
import './PrimeActivation.css';

const PrimeActivation = () => {
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('selection'); // selection, uploading, processing, success, error
  const [proofFile, setProofFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);

  const TIERS = [
    {
      id: 'week-pass',
      name: 'Week Pass',
      duration: '7 Days',
      description: 'Quick start to PRIME',
      color: 'tier-blue',
      autoApprove: true
    },
    {
      id: 'month-pass',
      name: 'Month Pass',
      duration: '30 Days',
      description: 'Monthly membership',
      color: 'tier-purple',
      autoApprove: true
    },
    {
      id: 'quarterly-pass',
      name: 'Quarterly Pass',
      duration: '90 Days',
      description: 'Three months of premium',
      color: 'tier-emerald',
      autoApprove: true
    },
    {
      id: 'yearly-pass',
      name: 'Yearly Pass',
      duration: '365 Days',
      description: 'Full year membership',
      color: 'tier-gold',
      autoApprove: false
    },
    {
      id: 'lifetime-pass',
      name: 'Lifetime Pass',
      duration: 'Forever',
      description: 'Permanent access',
      color: 'tier-diamond',
      autoApprove: false
    }
  ];

  // Get Telegram user info from WebApp
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const user = window.Telegram.WebApp.initData;
      const userInfo = window.Telegram.WebApp.initDataUnsafe?.user;
      if (userInfo) {
        setUserId(userInfo.id);
        setUsername(userInfo.username);
      }
      window.Telegram.WebApp.ready();
    }
  }, []);

  const handleTierSelect = (tierId) => {
    setSelectedTier(tierId);
    const tier = TIERS.find(t => t.id === tierId);
    
    if (tier.autoApprove) {
      setStatus('processing');
      processAutoActivation(tierId);
    } else {
      setStatus('uploading');
    }
  };

  const processAutoActivation = async (tierId) => {
    try {
      setLoading(true);
      const response = await fetch('/api/prime-activation/auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId,
          username: username,
          tier: tierId
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccessData({
          tier: data.displayName,
          startDate: new Date(data.startDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          endDate: new Date(data.endDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          nextPayment: data.nextPaymentDate 
            ? new Date(data.nextPaymentDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            : 'Never (Lifetime)'
        });
        setStatus('success');
      } else {
        setErrorMessage(data.error || 'Activation failed');
        setStatus('error');
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('Network error. Please try again.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setProofFile(file);
    }
  };

  const submitManualReview = async () => {
    if (!proofFile) {
      setErrorMessage('Please upload proof of payment');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('username', username);
      formData.append('tier', selectedTier);
      formData.append('proof', proofFile);

      const response = await fetch('/api/prime-activation/manual', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setSuccessData({
          tier: data.displayName,
          message: 'Your proof of payment has been submitted for admin review. You will receive a notification once it\'s approved.'
        });
        setStatus('success');
      } else {
        setErrorMessage(data.error || 'Submission failed');
        setStatus('error');
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('Network error. Please try again.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStatus('selection');
    setSelectedTier(null);
    setProofFile(null);
    setErrorMessage('');
    setSuccessData(null);
  };

  return (
    <div className="prime-activation-container">
      <div className="prime-header">
        <h1>🎉 PRIME Membership Activation</h1>
        <p className="deadline-badge">
          ⏰ Deadline: <strong>November 15 @ 12:00 PM Colombia Time</strong>
        </p>
      </div>

      {status === 'selection' && (
        <div className="selection-view">
          <div className="info-banner">
            <h2>Choose Your PRIME Tier</h2>
            <p>Thank you for your membership! Activate your account to access all premium features.</p>
          </div>

          <div className="tiers-grid">
            {TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`tier-card ${tier.color}`}
                onClick={() => handleTierSelect(tier.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="tier-header">
                  <h3>{tier.name}</h3>
                  {!tier.autoApprove && <span className="manual-review-badge">Requires Review</span>}
                </div>
                <div className="tier-duration">{tier.duration}</div>
                <p className="tier-description">{tier.description}</p>
                <button className="tier-select-btn">
                  {tier.autoApprove ? '✅ Activate Now' : '📤 Submit for Review'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === 'uploading' && (
        <div className="upload-view">
          <div className="upload-header">
            <h2>🔍 Upload Proof of Payment</h2>
            <p>Please provide proof of your original PRIME membership purchase</p>
          </div>

          <div className="upload-box">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              id="proof-upload"
              disabled={loading}
            />
            <label htmlFor="proof-upload" className="upload-label">
              <span className="upload-icon">📁</span>
              <span className="upload-text">
                {proofFile ? proofFile.name : 'Click to upload or drag and drop'}
              </span>
              <span className="upload-hint">PNG, JPG, or PDF</span>
            </label>
          </div>

          {proofFile && (
            <div className="file-preview">
              <p>✅ File selected: <strong>{proofFile.name}</strong></p>
              <button onClick={() => setProofFile(null)} className="remove-file-btn">
                Remove
              </button>
            </div>
          )}

          <div className="upload-actions">
            <button
              onClick={submitManualReview}
              disabled={!proofFile || loading}
              className="submit-btn"
            >
              {loading ? '⏳ Processing...' : '📤 Submit for Review'}
            </button>
            <button
              onClick={handleReset}
              disabled={loading}
              className="cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {status === 'processing' && (
        <div className="processing-view">
          <div className="spinner"></div>
          <h2>Processing Your Activation...</h2>
          <p>Please wait while we activate your membership</p>
        </div>
      )}

      {status === 'success' && successData && (
        <div className="success-view">
          <div className="success-icon">✅</div>
          <h2>Activation Successful!</h2>

          {successData.message ? (
            <div className="manual-message">
              <p className="info-text">{successData.message}</p>
            </div>
          ) : (
            <div className="activation-details">
              <div className="detail-item">
                <span className="detail-label">Tier</span>
                <span className="detail-value">{successData.tier}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Start Date</span>
                <span className="detail-value">{successData.startDate}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Expiration Date</span>
                <span className="detail-value">{successData.endDate}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Next Payment</span>
                <span className="detail-value">{successData.nextPayment}</span>
              </div>
            </div>
          )}

          <p className="success-message">
            🎁 Welcome to PRIME! You now have access to all premium features.
          </p>

          <button onClick={handleReset} className="close-btn">
            Close
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="error-view">
          <div className="error-icon">❌</div>
          <h2>Activation Failed</h2>
          <p className="error-message">{errorMessage}</p>
          <p className="error-hint">Please try again or contact support using /support command</p>

          <button onClick={handleReset} className="retry-btn">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default PrimeActivation;
