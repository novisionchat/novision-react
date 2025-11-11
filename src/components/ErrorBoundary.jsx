// src/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Bir sonraki render'da hata arayüzünü göstermek için state'i güncelle.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Hata bilgilerini state'e kaydet ki ekranda gösterebilelim.
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    // Bu hatayı bir log servisine de gönderebilirsin.
    console.error("ErrorBoundary yakaladı:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Hata olduğunda gösterilecek özel arayüz
      return (
        <div style={{ padding: '20px', color: 'white', backgroundColor: '#1a1a1a', height: '100%', overflowY: 'auto' }}>
          <h1>Uygulamada bir hata oluştu.</h1>
          <p>Lütfen sayfayı yenilemeyi deneyin.</p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px' }}>
            <summary>Hata Detayları</summary>
            {this.state.error && <h2>{this.state.error.toString()}</h2>}
            {this.state.errorInfo && <p>{this.state.errorInfo.componentStack}</p>}
          </details>
        </div>
      );
    }

    // Hata yoksa, içindeki bileşenleri normal şekilde render et.
    return this.props.children; 
  }
}

export default ErrorBoundary;