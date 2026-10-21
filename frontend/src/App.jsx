import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './controllers/AuthContext';
import AppRoutes from './routes/AppRoutes';

/// Không đụng, trừ phi thên middleware
export default function App() {
  return (
    <AuthProvider>
      <Router> 
        <Toaster position="top-right" />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
