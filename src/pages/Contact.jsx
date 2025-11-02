function Contact() {
  return (
    <>
      <style>{`
        .contact-wrap {
          background: #f8fafc;
          min-height: 100vh;
          padding: 40px 0;
        }
        
        .contact-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 0 20px;
        }
        
        .contact-hero {
          background: linear-gradient(135deg, #0066ff, #4B4BFF);
          color: white;
          border-radius: 20px;
          padding: 60px 40px;
          text-align: center;
          margin-bottom: 60px;
          box-shadow: 0 20px 60px rgba(0, 102, 255, 0.2);
          position: relative;
          overflow: hidden;
        }
        
        .contact-hero::before {
          content: '';
          position: absolute;
          top: -50px;
          right: -50px;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          border-radius: 50%;
        }
        
        .contact-hero::after {
          content: '';
          position: absolute;
          bottom: -80px;
          left: -80px;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(156,163,255,0.15) 0%, transparent 70%);
          border-radius: 50%;
        }
        
        .contact-hero h2 {
          font-size: clamp(32px, 4vw, 48px);
          font-weight: 800;
          margin: 0 0 20px;
          letter-spacing: -0.5px;
          position: relative;
          z-index: 2;
        }
        
        .contact-hero p {
          font-size: 18px;
          line-height: 1.6;
          margin: 0;
          opacity: 0.9;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          position: relative;
          z-index: 2;
        }
        
        .contact-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 60px;
        }
        
        .contact-info {
          background: white;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 8px 30px rgba(16, 24, 40, 0.08);
          border: 1px solid #e2e8f0;
        }
        
        .contact-info h3 {
          color: #0f172a;
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 24px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .contact-info h3::before {
          content: '';
          display: block;
          width: 4px;
          height: 24px;
          background: linear-gradient(135deg, #4B4BFF, #0066FF);
          border-radius: 2px;
        }
        
        .contact-details {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .contact-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
        }
        
        .contact-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 24, 40, 0.1);
          border-color: #4B4BFF;
        }
        
        .contact-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #4B4BFF, #0066FF);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: white;
          flex-shrink: 0;
        }
        
        .contact-text {
          flex: 1;
        }
        
        .contact-text strong {
          display: block;
          color: #0f172a;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .contact-text p {
          color: #667085;
          margin: 0;
          font-size: 16px;
          line-height: 1.5;
        }
        
        .contact-text a {
          color: #4B4BFF;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s ease;
        }
        
        .contact-text a:hover {
          color: #0066FF;
        }
        
        .contact-map {
          background: white;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 8px 30px rgba(16, 24, 40, 0.08);
          border: 1px solid #e2e8f0;
        }
        
        .contact-map h3 {
          color: #0f172a;
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 24px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .contact-map h3::before {
          content: '';
          display: block;
          width: 4px;
          height: 24px;
          background: linear-gradient(135deg, #4B4BFF, #0066FF);
          border-radius: 2px;
        }
        
        .map-placeholder {
          background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
          border-radius: 12px;
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-weight: 600;
          border: 2px dashed #cbd5e1;
        }
        
        .map-placeholder::before {
          content: '🗺️';
          font-size: 32px;
          margin-right: 12px;
        }
        
        .support-note {
          background: white;
          border-radius: 16px;
          padding: 32px 40px;
          box-shadow: 0 8px 30px rgba(16, 24, 40, 0.08);
          border: 1px solid #e2e8f0;
          text-align: center;
          margin-bottom: 40px;
        }
        
        .support-note p {
          color: #667085;
          font-size: 16px;
          line-height: 1.6;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .support-note p::before {
          content: '💬';
          font-size: 20px;
        }
        
        .contact-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 40px;
        }
        
        .action-card {
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 8px 30px rgba(16, 24, 40, 0.08);
          border: 1px solid #e2e8f0;
          text-align: center;
          transition: all 0.3s ease;
        }
        
        .action-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(16, 24, 40, 0.12);
          border-color: #4B4BFF;
        }
        
        .action-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #4B4BFF, #0066FF);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;
          margin: 0 auto 16px;
        }
        
        .action-card h4 {
          color: #0f172a;
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 8px;
        }
        
        .action-card p {
          color: #667085;
          font-size: 14px;
          line-height: 1.5;
          margin: 0 0 20px;
        }
        
        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #4B4BFF, #0066FF);
          color: white;
          text-decoration: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
        }
        
        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(75, 75, 255, 0.3);
        }
        
        .business-hours {
          background: white;
          border-radius: 16px;
          padding: 32px 40px;
          box-shadow: 0 8px 30px rgba(16, 24, 40, 0.08);
          border: 1px solid #e2e8f0;
          margin-top: 40px;
        }
        
        .business-hours h3 {
          color: #0f172a;
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 24px;
          text-align: center;
        }
        
        .hours-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        
        .hour-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }
        
        .day {
          color: #0f172a;
          font-weight: 600;
        }
        
        .time {
          color: #4B4BFF;
          font-weight: 600;
        }
        
        .closed {
          color: #dc2626;
        }
        
        /* Responsive Design */
        @media (max-width: 968px) {
          .contact-content {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          
          .contact-hero {
            padding: 48px 32px;
          }
        }
        
        @media (max-width: 768px) {
          .contact-wrap {
            padding: 24px 0;
          }
          
          .contact-hero {
            padding: 40px 24px;
            margin-bottom: 40px;
          }
          
          .contact-info, .contact-map {
            padding: 32px 24px;
          }
          
          .support-note {
            padding: 24px;
          }
          
          .business-hours {
            padding: 24px;
          }
          
          .contact-actions {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 480px) {
          .contact-item {
            flex-direction: column;
            text-align: center;
            gap: 12px;
          }
          
          .contact-icon {
            align-self: center;
          }
          
          .hours-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="contact-wrap">
        <div className="contact-container">
          {/* Hero Section */}
          <section className="contact-hero">
            <h2>Contact ClinicHub</h2>
            <p>
              We're here to help you with appointments, feedback, or any support you may need. 
              Get in touch with our friendly team.
            </p>
          </section>

          {/* Main Content */}
          <div className="contact-content">
            {/* Contact Information */}
            <div className="contact-info">
              <h3>Get In Touch</h3>
              <div className="contact-details">
                <div className="contact-item">
                  <div className="contact-icon">📧</div>
                  <div className="contact-text">
                    <strong>Email</strong>
                    <p>
                      <a href="mailto:support@clinichub.com">support@clinichub.com</a>
                    </p>
                    <p style={{ fontSize: '14px', marginTop: '4px' }}>We'll respond within 24 hours</p>
                  </div>
                </div>
                
                <div className="contact-item">
                  <div className="contact-icon">📞</div>
                  <div className="contact-text">
                    <strong>Phone</strong>
                    <p>
                      <a href="tel:+37062584851">+370 625 84851</a>
                    </p>
                    <p style={{ fontSize: '14px', marginTop: '4px' }}>Mon-Fri, 9:00 AM - 6:00 PM</p>
                  </div>
                </div>
                
                <div className="contact-item">
                  <div className="contact-icon">📍</div>
                  <div className="contact-text">
                    <strong>Address</strong>
                    <p>Maironio G-38<br />Kaunas, Lithuania</p>
                    <p style={{ fontSize: '14px', marginTop: '4px' }}>Visit our main office</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Section */}
            <div className="contact-map">
              <h3>Find Us</h3>
              <div className="map-placeholder">
                Interactive Map - Kaunas, Lithuania
              </div>
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <p style={{ color: '#667085', fontSize: '14px', margin: 0 }}>
                  Located in the heart of Kaunas with easy access to public transportation
                </p>
              </div>
            </div>
          </div>

          {/* Support Note */}
          <div className="support-note">
            <p>Our team typically responds within 24 hours on working days</p>
          </div>

          {/* Quick Actions */}
          <div className="contact-actions">
            <div className="action-card">
              <div className="action-icon">📋</div>
              <h4>Book Appointment</h4>
              <p>Schedule your visit with one of our trusted doctors</p>
              <a href="/all-doctors" className="action-btn">
                Book Now →
              </a>
            </div>
            
            <div className="action-card">
              <div className="action-icon">❓</div>
              <h4>FAQ & Help</h4>
              <p>Find answers to common questions about our services</p>
              <a href="/help" className="action-btn">
                View Help Center →
              </a>
            </div>
            
            <div className="action-card">
              <div className="action-icon">💬</div>
              <h4>Live Chat</h4>
              <p>Chat with our support team in real-time</p>
              <a href="#" className="action-btn">
                Start Chat →
              </a>
            </div>
          </div>

          {/* Business Hours */}
          <div className="business-hours">
            <h3>Business Hours</h3>
            <div className="hours-grid">
              <div className="hour-item">
                <span className="day">Monday - Friday</span>
                <span className="time">9:00 AM - 6:00 PM</span>
              </div>
              <div className="hour-item">
                <span className="day">Saturday</span>
                <span className="time">10:00 AM - 4:00 PM</span>
              </div>
              <div className="hour-item">
                <span className="day">Sunday</span>
                <span className="time closed">Closed</span>
              </div>
              <div className="hour-item">
                <span className="day">Emergency Support</span>
                <span className="time">24/7 Available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Contact;