import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
    return (
        <div style={{ textAlign: 'center', marginTop: '15vh', fontFamily: 'sans-serif' }}>
            <h1 style={{ fontSize: '2.5rem', color: '#333' }}>COMPANY Recruitment Platform (MVP)</h1>
            <p style={{ color: '#666', marginBottom: '2rem' }}>Select your portal to proceed</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
                <Link to="/admin" style={{ textDecoration: 'none' }}>
                    <button style={{ padding: '1rem 2rem', fontSize: '1.1rem', cursor: 'pointer', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '6px' }}>
                        Admin Dashboard
                    </button>
                </Link>
                <Link to="/candidate" style={{ textDecoration: 'none' }}>
                    <button style={{ padding: '1rem 2rem', fontSize: '1.1rem', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px' }}>
                        Candidate Portal
                    </button>
                </Link>
            </div>
        </div>
    );
};

export default Home;