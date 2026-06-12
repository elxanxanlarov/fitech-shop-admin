import { useEffect } from 'react';
import currentVersionData from '../version.json';

const VersionChecker = () => {
    useEffect(() => {
        let isChecking = false;

        const checkVersion = async () => {
            if (isChecking) return;
            isChecking = true;

            try {
                // Add timestamp to prevent caching
                const res = await fetch(`/version.json?t=${new Date().getTime()}`);
                if (!res.ok) {
                    isChecking = false;
                    return;
                }
                
                const data = await res.json();
                
                // Compare fetched version with the currently loaded bundle's version
                if (data && data.version && data.version > currentVersionData.version) {
                    console.log('Yeni versiya tapıldı. Keş təmizlənir və səhifə yenilənir...');
                    
                    // Clear caches
                    if (window.caches) {
                        try {
                            const keys = await caches.keys();
                            for (let key of keys) {
                                await caches.delete(key);
                            }
                        } catch (e) {
                            console.error('Keş təmizlənməsində xəta:', e);
                        }
                    }

                    // Reload page to fetch new JS/CSS
                    window.location.reload(true);
                }
            } catch (error) {
                console.error('Versiya yoxlanışında xəta:', error);
            } finally {
                isChecking = false;
            }
        };

        // Check on component mount (initial load + slightly delayed to not block UI)
        setTimeout(checkVersion, 2000);

        // Then check periodically every 2 minutes
        const intervalId = setInterval(checkVersion, 2 * 60 * 1000);

        // Also check when window regains focus (e.g. user returns to tab)
        window.addEventListener('focus', checkVersion);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('focus', checkVersion);
        };
    }, []);

    return null; // This component doesn't render anything
};

export default VersionChecker;
