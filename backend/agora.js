const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const generateToken = (req, res) => {
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
        console.error('Agora yapılandırma hatası: App ID veya Certificate eksik');
        return res.status(500).json({ 
            error: 'Agora servisi yapılandırılmamış.',
            message: 'Agora App ID veya Sertifika sunucuda tanımlanmamış.' 
        });
    }

    const channelName = req.params.channel;
    const uid = parseInt(req.params.uid) || 0;
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    if (!channelName) {
        return res.status(400).json({ 
            error: 'Geçersiz istek',
            message: 'Kanal adı gerekli.' 
        });
    }

    try {
        const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs);
        console.log(`Agora token oluşturuldu: kanal=${channelName}, uid=${uid}`);
        return res.json({ token: token });
    } catch (error) {
        console.error('Agora token oluşturma hatası:', error);
        return res.status(500).json({ 
            error: 'Token oluşturulamadı',
            message: error.message 
        });
    }
};

module.exports = { generateToken };