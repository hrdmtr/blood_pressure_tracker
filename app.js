// Blood Pressure Tracker Application
class BloodPressureTracker {
    constructor() {
        this.readings = this.loadReadings();
        this.currentPhoto = null;
        this.deleteTargetId = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setDefaultDateTime();
        this.renderHistory();
        this.renderChart();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Camera functionality
        document.getElementById('camera-btn').addEventListener('click', () => this.startCamera());
        document.getElementById('capture-btn').addEventListener('click', () => this.capturePhoto());
        document.getElementById('cancel-camera-btn').addEventListener('click', () => this.stopCamera());
        document.getElementById('retake-btn').addEventListener('click', () => this.retakePhoto());

        // Form submission
        document.getElementById('bp-form').addEventListener('submit', (e) => this.handleSubmit(e));

        // History filter
        document.getElementById('filter-period').addEventListener('change', () => this.renderHistory());

        // Graph period
        document.getElementById('graph-period').addEventListener('change', () => this.renderChart());

        // Delete modal
        document.getElementById('confirm-delete').addEventListener('click', () => this.confirmDelete());
        document.getElementById('cancel-delete').addEventListener('click', () => this.hideDeleteModal());
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Refresh content when switching tabs
        if (tabName === 'history') {
            this.renderHistory();
        } else if (tabName === 'graph') {
            this.renderChart();
        }
    }

    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            
            const video = document.getElementById('video');
            video.srcObject = stream;
            
            document.getElementById('camera-btn').classList.add('hidden');
            document.getElementById('camera-preview').classList.remove('hidden');
        } catch (error) {
            console.error('Camera access error:', error);
            alert('カメラにアクセスできませんでした。カメラの許可を確認してください。');
        }
    }

    stopCamera() {
        const video = document.getElementById('video');
        const stream = video.srcObject;
        
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        
        document.getElementById('camera-preview').classList.add('hidden');
        document.getElementById('camera-btn').classList.remove('hidden');
    }

    capturePhoto() {
        const video = document.getElementById('video');
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0);
        
        this.currentPhoto = canvas.toDataURL('image/jpeg');
        
        document.getElementById('photo').src = this.currentPhoto;
        document.getElementById('captured-image').classList.remove('hidden');
        
        this.stopCamera();
    }

    retakePhoto() {
        this.currentPhoto = null;
        document.getElementById('captured-image').classList.add('hidden');
        this.startCamera();
    }

    setDefaultDateTime() {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = new Date(now - offset).toISOString().slice(0, 16);
        document.getElementById('datetime').value = localISOTime;
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const reading = {
            id: Date.now(),
            systolic: parseInt(formData.get('systolic')),
            diastolic: parseInt(formData.get('diastolic')),
            pulse: formData.get('pulse') ? parseInt(formData.get('pulse')) : null,
            datetime: formData.get('datetime'),
            notes: formData.get('notes'),
            photo: this.currentPhoto,
            category: this.getBloodPressureCategory(
                parseInt(formData.get('systolic')),
                parseInt(formData.get('diastolic'))
            )
        };

        this.readings.push(reading);
        this.saveReadings();
        
        // Reset form and photo
        e.target.reset();
        this.setDefaultDateTime();
        this.currentPhoto = null;
        document.getElementById('captured-image').classList.add('hidden');
        
        // Show success message
        alert('血圧記録を保存しました！');
        
        // Switch to history tab
        this.switchTab('history');
    }

    getBloodPressureCategory(systolic, diastolic) {
        if (systolic >= 140 || diastolic >= 90) {
            return 'high';
        } else if (systolic >= 120 || diastolic >= 80) {
            return 'elevated';
        } else {
            return 'normal';
        }
    }

    getCategoryLabel(category) {
        const labels = {
            'normal': '正常',
            'elevated': '高値血圧',
            'high': '高血圧'
        };
        return labels[category] || '';
    }

    formatDateTime(datetime) {
        const date = new Date(datetime);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    filterReadings(period) {
        if (period === 'all') {
            return this.readings;
        }

        const days = parseInt(period);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return this.readings.filter(reading => {
            return new Date(reading.datetime) >= cutoffDate;
        });
    }

    renderHistory() {
        const period = document.getElementById('filter-period').value;
        const filteredReadings = this.filterReadings(period);
        const historyList = document.getElementById('history-list');

        if (filteredReadings.length === 0) {
            historyList.innerHTML = '<p class="empty-state">まだ記録がありません</p>';
            return;
        }

        // Sort by datetime (newest first)
        const sortedReadings = [...filteredReadings].sort((a, b) => {
            return new Date(b.datetime) - new Date(a.datetime);
        });

        historyList.innerHTML = sortedReadings.map(reading => `
            <div class="history-item ${reading.category}-bp">
                <div class="history-header">
                    <span class="history-date">${this.formatDateTime(reading.datetime)}</span>
                    <div>
                        <span class="bp-category ${reading.category}">${this.getCategoryLabel(reading.category)}</span>
                        <button class="delete-btn" onclick="tracker.showDeleteModal(${reading.id})">削除</button>
                    </div>
                </div>
                <div class="history-readings">
                    <div class="reading">
                        <div class="reading-label">最高血圧</div>
                        <div class="reading-value">${reading.systolic}</div>
                    </div>
                    <div class="reading">
                        <div class="reading-label">最低血圧</div>
                        <div class="reading-value">${reading.diastolic}</div>
                    </div>
                    ${reading.pulse ? `
                        <div class="reading">
                            <div class="reading-label">脈拍</div>
                            <div class="reading-value">${reading.pulse}</div>
                        </div>
                    ` : ''}
                </div>
                ${reading.photo ? `
                    <div style="margin-top: 10px;">
                        <img src="${reading.photo}" alt="血圧計の写真" style="max-width: 200px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    </div>
                ` : ''}
                ${reading.notes ? `
                    <div class="history-notes">メモ: ${reading.notes}</div>
                ` : ''}
            </div>
        `).join('');
    }

    renderChart() {
        const period = document.getElementById('graph-period').value;
        const filteredReadings = this.filterReadings(period);

        if (filteredReadings.length === 0) {
            document.querySelector('.chart-container').classList.add('hidden');
            document.getElementById('no-data-message').classList.remove('hidden');
            return;
        }

        document.querySelector('.chart-container').classList.remove('hidden');
        document.getElementById('no-data-message').classList.add('hidden');

        // Sort by datetime (oldest first for chart)
        const sortedReadings = [...filteredReadings].sort((a, b) => {
            return new Date(a.datetime) - new Date(b.datetime);
        });

        const canvas = document.getElementById('bp-chart');
        const ctx = canvas.getContext('2d');
        
        // Get parent container dimensions
        const container = canvas.parentElement;
        const containerWidth = container.offsetWidth;
        
        // Set canvas size - use devicePixelRatio for sharp rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = containerWidth * dpr;
        canvas.height = 400 * dpr;
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = '400px';
        
        // Scale for device pixel ratio
        ctx.scale(dpr, dpr);
        
        const width = containerWidth;
        const height = 400;
        const padding = 50;
        const chartWidth = width - (padding * 2);
        const chartHeight = height - (padding * 2);
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Find min and max values
        const allValues = sortedReadings.flatMap(r => [
            r.systolic, 
            r.diastolic, 
            r.pulse || 0
        ].filter(v => v > 0));
        
        const minValue = Math.max(0, Math.min(...allValues) - 10);
        const maxValue = Math.max(...allValues) + 10;
        const valueRange = maxValue - minValue;
        
        // Helper function to convert data to canvas coordinates
        const getX = (index) => padding + (index / (sortedReadings.length - 1 || 1)) * chartWidth;
        const getY = (value) => height - padding - ((value - minValue) / valueRange) * chartHeight;
        
        // Draw grid lines
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (i / 5) * chartHeight;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
            
            // Draw y-axis labels
            const value = Math.round(maxValue - (i / 5) * valueRange);
            ctx.fillStyle = '#666';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(value, padding - 10, y + 4);
        }
        
        // Draw axes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        // Draw legend
        const legendItems = [
            { label: '最高血圧', color: '#dc3545' },
            { label: '最低血圧', color: '#4a90e2' },
            { label: '脈拍', color: '#28a745' }
        ];
        
        let legendX = padding + 10;
        legendItems.forEach(item => {
            ctx.fillStyle = item.color;
            ctx.fillRect(legendX, 20, 15, 15);
            ctx.fillStyle = '#333';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(item.label, legendX + 20, 32);
            legendX += 120;
        });
        
        // Draw lines
        const drawLine = (values, color, dash = false) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            if (dash) {
                ctx.setLineDash([5, 5]);
            } else {
                ctx.setLineDash([]);
            }
            
            ctx.beginPath();
            values.forEach((value, index) => {
                if (value !== null && value > 0) {
                    const x = getX(index);
                    const y = getY(value);
                    if (index === 0 || values[index - 1] === null || values[index - 1] === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
            });
            ctx.stroke();
            
            // Draw points
            ctx.fillStyle = color;
            values.forEach((value, index) => {
                if (value !== null && value > 0) {
                    const x = getX(index);
                    const y = getY(value);
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        };
        
        // Extract data
        const systolicData = sortedReadings.map(r => r.systolic);
        const diastolicData = sortedReadings.map(r => r.diastolic);
        const pulseData = sortedReadings.map(r => r.pulse || null);
        
        // Draw lines
        drawLine(systolicData, '#dc3545');
        drawLine(diastolicData, '#4a90e2');
        drawLine(pulseData, '#28a745', true);
        
        // Draw x-axis labels (dates)
        ctx.fillStyle = '#666';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.setLineDash([]);
        
        sortedReadings.forEach((reading, index) => {
            const x = getX(index);
            const date = new Date(reading.datetime);
            const label = `${date.getMonth() + 1}/${date.getDate()}`;
            ctx.fillText(label, x, height - padding + 20);
        });
    }

    showDeleteModal(id) {
        this.deleteTargetId = id;
        document.getElementById('delete-modal').classList.remove('hidden');
    }

    hideDeleteModal() {
        this.deleteTargetId = null;
        document.getElementById('delete-modal').classList.add('hidden');
    }

    confirmDelete() {
        if (this.deleteTargetId) {
            this.readings = this.readings.filter(r => r.id !== this.deleteTargetId);
            this.saveReadings();
            this.renderHistory();
            this.hideDeleteModal();
        }
    }

    loadReadings() {
        const saved = localStorage.getItem('bp-readings');
        return saved ? JSON.parse(saved) : [];
    }

    saveReadings() {
        localStorage.setItem('bp-readings', JSON.stringify(this.readings));
    }
}

// Initialize the application
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new BloodPressureTracker();
});
