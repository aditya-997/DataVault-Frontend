import React from 'react';

export default function ResultCard({ isSuccess, message, storagePath, onReset }) {
  return (
    <div className="result-card">
      <div className="result-header">
        <span className="result-icon">{isSuccess ? '✅' : '❌'}</span>
        <h3>{isSuccess ? 'Upload Successful' : 'Upload Failed'}</h3>
      </div>
      <div className="result-body">
        <p className="result-message">{message}</p>
        {isSuccess && storagePath && (
          <div className="path-box">
            <span className="path-label">Storage Location:</span>
            <code>{storagePath}</code>
          </div>
        )}
      </div>
      <button type="button" className="close-result-btn" onClick={onReset}>
        {isSuccess ? 'Upload Another File' : 'Try Again'}
      </button>
    </div>
  );
}
