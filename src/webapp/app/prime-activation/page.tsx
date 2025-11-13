"use client";

import React, { useState, useEffect } from 'react';

const TIERS = [
  {
    id: 'week-pass',
    name: 'Pase Semanal',
    duration: '7 Días',
    description: 'Inicio rápido a PRIME',
    color: 'bg-blue-500/20 border-blue-500',
    autoApprove: true
  },
  {
    id: 'month-pass',
    name: 'Pase Mensual',
    duration: '30 Días',
    description: 'Membresía mensual',
    color: 'bg-purple-500/20 border-purple-500',
    autoApprove: true
  },
  {
    id: 'quarterly-pass',
    name: 'Pase Trimestral',
    duration: '90 Días',
    description: 'Tres meses de premium',
    color: 'bg-emerald-500/20 border-emerald-500',
    autoApprove: true
  },
  {
    id: 'yearly-pass',
    name: 'Pase Anual',
    duration: '365 Días',
    description: 'Membresía de un año completo',
    color: 'bg-yellow-500/20 border-yellow-500',
    autoApprove: false
  },
  {
    id: 'lifetime-pass',
    name: 'Pase de Por Vida',
    duration: 'Para Siempre',
    description: 'Acceso permanente',
    color: 'bg-pink-500/20 border-pink-500',
    autoApprove: false
  }
];

export default function PrimeActivationPage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'selection' | 'uploading' | 'processing' | 'success' | 'error'>('selection');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState<any>(null);

  useEffect(() => {
    const initTelegram = () => {
      // Add small delay to ensure Telegram object is fully loaded
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          try {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            
            const userInfo = window.Telegram.WebApp.initDataUnsafe?.user;
            console.log('Telegram user info:', userInfo);
            
            if (userInfo && userInfo.id) {
              setUserId(userInfo.id);
              setUsername(userInfo.username || null);
              console.log('User initialized:', userInfo.id);
            } else {
              console.error('No user info in Telegram WebApp');
              setStatus('error');
              setErrorMessage('Esta página debe ser abierta desde Telegram. / This page must be opened from Telegram.');
            }
          } catch (error) {
            console.error('Error initializing Telegram:', error);
            setStatus('error');
            setErrorMessage('Error initializing Telegram context. / Error inicializando contexto de Telegram.');
          }
        } else {
          console.error('Telegram WebApp not available');
          setStatus('error');
          setErrorMessage('Esta página debe ser abierta desde el bot de Telegram. Haz clic en el botón "Activar Membresía" del mensaje broadcast. / This page must be opened from the Telegram bot. Click the "Activate Membership" button from the broadcast message.');
        }
      }, 100);
    };

    initTelegram();
  }, []);

  const handleTierSelect = (tierId: string) => {
    setSelectedTier(tierId);
    const tier = TIERS.find(t => t.id === tierId);

    if (tier?.autoApprove) {
      setStatus('processing');
      processAutoActivation(tierId);
    } else {
      setStatus('uploading');
    }
  };

  const processAutoActivation = async (tierId: string) => {
    try {
      setLoading(true);
      
      if (!userId) {
        setErrorMessage('User ID not available. Please reopen from Telegram.');
        setStatus('error');
        return;
      }

      console.log('Processing activation:', { userId, username, tierId });
      
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
      console.log('API Response:', data);

      if (data.success) {
        setSuccessData({
          tier: data.displayName,
          startDate: new Date(data.startDate).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          endDate: new Date(data.endDate).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          nextPayment: data.nextPaymentDate
            ? new Date(data.nextPaymentDate).toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            : 'Nunca (De Por Vida)'
        });
        setStatus('success');
      } else {
        setErrorMessage(data.error || 'Activación fallida');
        setStatus('error');
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('Error de red. Por favor intenta de nuevo.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProofFile(file);
    }
  };

  const submitManualReview = async () => {
    if (!proofFile) {
      setErrorMessage('Por favor sube el comprobante de pago');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('userId', userId?.toString() || '');
      formData.append('username', username || '');
      formData.append('tier', selectedTier || '');
      formData.append('proof', proofFile);

      const response = await fetch('/api/prime-activation/manual', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setSuccessData({
          tier: data.displayName,
          message: 'Tu comprobante de pago ha sido enviado para revisión administrativa. Recibirás una notificación una vez sea aprobado.'
        });
        setStatus('success');
      } else {
        setErrorMessage(data.error || 'Envío fallido');
        setStatus('error');
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('Error de red. Por favor intenta de nuevo.');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-6">
          <h1 className="text-4xl font-bold mb-3">🎉 Activación de Membresía PRIME</h1>
          <div className="inline-block bg-red-500/20 border border-red-500 rounded-lg px-4 py-2">
            <p className="text-sm">
              ⏰ Fecha Límite: <strong>15 de Noviembre @ 12:00 PM Hora Colombia</strong>
            </p>
          </div>
        </div>

        {/* Selection View */}
        {status === 'selection' && (
          <div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-2">Elige Tu Nivel PRIME</h2>
              <p className="text-gray-300">¡Gracias por tu membresía! Activa tu cuenta para acceder a todas las funciones premium.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TIERS.map((tier) => (
                <div
                  key={tier.id}
                  className={`${tier.color} border-2 rounded-xl p-6 cursor-pointer hover:scale-105 transition-transform`}
                  onClick={() => handleTierSelect(tier.id)}
                >
                  <div className="mb-4">
                    <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                    {!tier.autoApprove && (
                      <span className="text-xs bg-orange-500/30 border border-orange-500 rounded px-2 py-1">
                        Requiere Revisión
                      </span>
                    )}
                  </div>
                  <div className="text-3xl font-bold mb-2">{tier.duration}</div>
                  <p className="text-gray-300 text-sm mb-4">{tier.description}</p>
                  <button className="w-full bg-white/10 hover:bg-white/20 rounded-lg py-2 font-semibold transition-colors">
                    {tier.autoApprove ? '✅ Activar Ahora' : '📤 Enviar para Revisión'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload View */}
        {status === 'uploading' && (
          <div className="bg-slate-800/50 rounded-xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">🔍 Sube Comprobante de Pago</h2>
              <p className="text-gray-300">Por favor proporciona prueba de tu compra original de membresía PRIME</p>
            </div>

            <div className="border-2 border-dashed border-gray-500 rounded-lg p-8 mb-6 text-center">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                id="proof-upload"
                disabled={loading}
                className="hidden"
              />
              <label htmlFor="proof-upload" className="cursor-pointer">
                <div className="text-6xl mb-4">📁</div>
                <div className="text-lg mb-2">
                  {proofFile ? proofFile.name : 'Haz clic para subir o arrastra y suelta'}
                </div>
                <div className="text-sm text-gray-400">PNG, JPG, o PDF</div>
              </label>
            </div>

            {proofFile && (
              <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-6">
                <p className="mb-2">✅ Archivo seleccionado: <strong>{proofFile.name}</strong></p>
                <button
                  onClick={() => setProofFile(null)}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Remover
                </button>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={submitManualReview}
                disabled={!proofFile || loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg py-3 font-semibold transition-colors"
              >
                {loading ? '⏳ Procesando...' : '📤 Enviar para Revisión'}
              </button>
              <button
                onClick={handleReset}
                disabled={loading}
                className="px-6 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Processing View */}
        {status === 'processing' && (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold mb-2">Procesando Tu Activación...</h2>
            <p className="text-gray-300">Por favor espera mientras activamos tu membresía</p>
          </div>
        )}

        {/* Success View */}
        {status === 'success' && successData && (
          <div className="bg-green-500/10 border border-green-500 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-3xl font-bold mb-6">¡Activación Exitosa!</h2>

            {successData.message ? (
              <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-6 mb-6">
                <p className="text-lg">{successData.message}</p>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                <div className="flex justify-between bg-white/5 rounded-lg p-4">
                  <span className="text-gray-400">Nivel</span>
                  <span className="font-semibold">{successData.tier}</span>
                </div>
                <div className="flex justify-between bg-white/5 rounded-lg p-4">
                  <span className="text-gray-400">Fecha de Inicio</span>
                  <span className="font-semibold">{successData.startDate}</span>
                </div>
                <div className="flex justify-between bg-white/5 rounded-lg p-4">
                  <span className="text-gray-400">Fecha de Expiración</span>
                  <span className="font-semibold">{successData.endDate}</span>
                </div>
                <div className="flex justify-between bg-white/5 rounded-lg p-4">
                  <span className="text-gray-400">Próximo Pago</span>
                  <span className="font-semibold">{successData.nextPayment}</span>
                </div>
              </div>
            )}

            <p className="text-lg mb-6">
              🎁 ¡Bienvenido a PRIME! Ahora tienes acceso a todas las funciones premium.
            </p>

            <button
              onClick={handleReset}
              className="bg-white text-slate-900 hover:bg-gray-200 rounded-lg px-8 py-3 font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Error View */}
        {status === 'error' && (
          <div className="bg-red-500/10 border border-red-500 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-3xl font-bold mb-4">Activación Fallida</h2>
            <p className="text-xl mb-2">{errorMessage}</p>
            {!userId && (
              <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 mb-4">
                <p className="text-sm">⚠️ Debug Info: userId is null. This page must be opened as a Telegram Mini App using the web_app button.</p>
              </div>
            )}
            <p className="text-gray-400 mb-6">Por favor intenta de nuevo o contacta a soporte usando el comando /support</p>

            <button
              onClick={handleReset}
              className="bg-blue-600 hover:bg-blue-700 rounded-lg px-8 py-3 font-semibold transition-colors"
            >
              Intentar de Nuevo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
