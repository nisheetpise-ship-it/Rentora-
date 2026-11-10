/**
 * RENTORA — SMART PG & HOSTEL MANAGEMENT — MOBILE VERIFICATION SYSTEM
 * Powered by Rentora
 * Handles mobile OTP generation, WhatsApp integration, and verification state.
 */

const MobileVerification = {
    _currentOTP: null,
    _currentPhone: null,
    _callback: null,
    _timerInterval: null,
    _cooldownActive: false,
    
    openVerificationModal(phone, callback) {
        this._callback = callback;
        this._currentPhone = phone || '';
        this._currentOTP = null;
        this._cooldownActive = false;
        
        const html = `
            <div class="mobile-verification-container">
                <div class="form-group">
                    <label class="form-label">Phone Number (India only)</label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.2rem; font-weight: bold;">+91</span>
                        <input type="tel" id="mobile-verify-phone" class="form-input" placeholder="10-digit number" value="${this._currentPhone}" maxlength="10">
                    </div>
                </div>
                
                <button id="btn-send-otp" class="btn btn-primary" style="width: 100%; margin-top: 15px;" onclick="MobileVerification.sendOTP()">
                    📲 Send OTP via WhatsApp
                </button>
                
                <div id="otp-section" style="display: none; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                    <div style="text-align: center; margin-bottom: 15px;">
                        <p class="badge" style="background-color: #d1fae5; color: #065f46; padding: 5px 10px; border-radius: 4px;">OTP sent! Check WhatsApp on +91 <span id="display-phone"></span></p>
                        <p id="otp-timer-text" style="font-size: 0.9rem; color: #666; margin-top: 5px;">Resend in: <span id="otp-timer">60</span>s</p>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" style="text-align: center;">Enter 6-digit OTP</label>
                        <input type="text" id="mobile-verify-otp" class="form-input" placeholder="• • • • • •" maxlength="6" style="text-align: center; font-size: 1.5rem; letter-spacing: 5px;">
                    </div>
                    
                    <button id="btn-verify-otp" class="btn btn-success" style="width: 100%; margin-top: 10px;" onclick="MobileVerification.verifyOTP()">
                        ✅ Verify & Continue
                    </button>
                    
                    <button id="btn-resend-otp" class="btn btn-ghost" style="width: 100%; margin-top: 10px; display: none;" onclick="MobileVerification.sendOTP()">
                        Resend OTP
                    </button>
                </div>
            </div>
        `;
        
        if (typeof showModal === 'function') {
            showModal('📱 Mobile Verification', html);
        } else {
            console.error("showModal is not defined. Cannot open modal.");
        }
    },
    
    sendOTP() {
        if (this._cooldownActive) return;
        
        const phoneInput = document.getElementById('mobile-verify-phone');
        let phone = phoneInput.value.trim();
        
        if (!phone || phone.length !== 10 || !/^\d{10}$/.test(phone)) {
            if (typeof showToast === 'function') showToast('Please enter a valid 10-digit phone number', 'error');
            return;
        }
        
        this._currentPhone = phone;
        // Generate random 6-digit OTP
        this._currentOTP = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Disable inputs while sending
        document.getElementById('btn-send-otp').disabled = true;
        phoneInput.disabled = true;
        
        // Show OTP section
        document.getElementById('otp-section').style.display = 'block';
        document.getElementById('display-phone').textContent = phone;
        document.getElementById('btn-resend-otp').style.display = 'none';
        document.getElementById('otp-timer-text').style.display = 'block';
        
        // Open WhatsApp
        const message = `🏠 Rentora - Tenant Verification\n\nYour verification code is: ${this._currentOTP}\n\nPlease share this code with your PG owner to complete registration.`;
        const whatsappUrl = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        if (typeof showToast === 'function') showToast('OTP sent via WhatsApp', 'success');
        
        // Start Timer
        this.startCooldown();
        
        // Auto-focus OTP input
        const otpInput = document.getElementById('mobile-verify-otp');
        otpInput.value = '';
        setTimeout(() => otpInput.focus(), 500);
    },
    
    startCooldown() {
        this._cooldownActive = true;
        let timeLeft = 60;
        
        if (this._timerInterval) clearInterval(this._timerInterval);
        
        const timerSpan = document.getElementById('otp-timer');
        timerSpan.textContent = timeLeft;
        
        this._timerInterval = setInterval(() => {
            timeLeft--;
            timerSpan.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(this._timerInterval);
                this._cooldownActive = false;
                document.getElementById('otp-timer-text').style.display = 'none';
                document.getElementById('btn-resend-otp').style.display = 'block';
                document.getElementById('btn-send-otp').disabled = false;
                document.getElementById('mobile-verify-phone').disabled = false;
            }
        }, 1000);
    },
    
    verifyOTP() {
        const otpInput = document.getElementById('mobile-verify-otp').value.trim();
        
        if (!this._currentOTP) {
            if (typeof showToast === 'function') showToast('Please send an OTP first', 'error');
            return;
        }
        
        if (otpInput.length !== 6) {
            if (typeof showToast === 'function') showToast('Please enter a 6-digit OTP', 'error');
            return;
        }
        
        if (otpInput === this._currentOTP) {
            if (typeof SoundFX !== 'undefined' && SoundFX.success) SoundFX.success();
            if (typeof showToast === 'function') showToast('✅ Verification successful!', 'success');
            
            if (this._timerInterval) clearInterval(this._timerInterval);
            
            if (typeof closeModal === 'function') closeModal();
            
            const resultData = {
                method: 'MOBILE_OTP',
                phone: `91${this._currentPhone}`,
                maskedPhone: `XXXXXX${this._currentPhone.substring(6)}`,
                verified: true,
                verifiedAt: new Date().toISOString()
            };
            
            // Store in TenantKYC so the verification gate passes
            TenantKYC.setData(resultData);
            
            if (this._callback) {
                this._callback(resultData);
            }
        } else {
            if (typeof SoundFX !== 'undefined' && SoundFX.error) SoundFX.error();
            if (typeof showToast === 'function') showToast('Invalid OTP. Please try again.', 'error');
            document.getElementById('mobile-verify-otp').value = '';
            document.getElementById('mobile-verify-otp').focus();
        }
    }
};

const TenantKYC = {
    _verifiedData: null,
    
    reset() {
        this._verifiedData = null;
    },
    
    isVerified() {
        return !!(this._verifiedData && this._verifiedData.verified);
    },
    
    getData() {
        return this._verifiedData;
    },
    
    setData(data) {
        this._verifiedData = data;
    }
};
