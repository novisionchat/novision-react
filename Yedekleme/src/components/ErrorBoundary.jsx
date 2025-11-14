// --- DOSYA: src/components/ErrorBoundary.jsx (GÜNCELLENMİŞ HALİ) ---
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Bir sonraki render'da fallback UI'ı göstermek için state'i güncelle.
    return { hasError: true, error: error };
  }

  componentDidCatch(error, errorInfo) {
    // Hata bilgisini state'e kaydet
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    // İsterseniz bu hatayı bir log servisine de gönderebilirsiniz.
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Hata durumunda gösterilecek özel UI
      return (
        <div style={{ padding: '20px', color: 'white', backgroundColor: '#1a1a1a', height: '100vh' }}>
          <h2>Uygulamada bir hata oluştu.</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '15px' }}>
            <summary>Hata Detayları</summary>
            <pre style={{ color: '#ff79c6', background: '#282a36', padding: '10px', borderRadius: '5px', marginTop: '10px' }}>
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </details>
          <button onClick={() => window.location.reload()} style={{marginTop: '20px'}}>Sayfayı Yenile</button>
        </div>
      );
    }

    // Hata yoksa, normal şekilde alt bileşenleri render et.
    return this.props.children;
  }
}

export default ErrorBoundary;