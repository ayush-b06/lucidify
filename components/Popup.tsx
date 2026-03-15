import Image from 'next/image';
import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface PopupProps {
  closePopup: () => void;
  isVisible: boolean;
}

const Popup: React.FC<PopupProps> = ({ closePopup, isVisible }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    industry: '',
    projectDetails: '',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prevState) => ({ ...prevState, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'project ideas'), formData);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting project idea:', error);
      alert('Failed to submit project idea. Please try again.');
    }
  };

  const inputClass = "w-full p-[10px] sm:p-[11px] rounded-[10px] text-white text-[13px] sm:text-[14px] placeholder-[rgba(255,255,255,0.35)] focus:outline-none transition-all duration-200";
  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
  };

  return (
    <div
      className={`fixed inset-0 flex justify-center items-end sm:items-center z-[100] transition-opacity duration-300 px-[12px] sm:px-0 pb-[12px] sm:pb-0 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
    >
      <div
        className={`PopupCard relative w-full sm:w-auto rounded-[24px] sm:rounded-[20px] transform transition-all duration-300 ${isVisible ? 'translate-y-0 scale-100' : 'translate-y-[50px] scale-[0.97]'} py-[28px] px-[20px] sm:px-[56px] sm:py-[36px] max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto`}
        style={{
          background: 'linear-gradient(160deg, #1c1828 0%, #120f1e 50%, #0e0c18 100%)',
          border: '1px solid rgba(114,92,247,0.18)',
          boxShadow: '0 0 0 1px rgba(114,92,247,0.08), 0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(90,60,200,0.12)',
        }}
      >
        {/* Purple glow top accent */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px]"
          style={{ background: 'linear-gradient(to right, transparent, rgba(114,92,247,0.6), transparent)' }}
        />

        {/* Close button */}
        <button
          onClick={closePopup}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.10)',
            padding: 0,
            cursor: 'pointer',
            transition: 'transform 150ms',
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <path d="M1 1l8 8M9 1L1 9" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Drag handle on mobile */}
        <div className="sm:hidden w-[36px] h-[3px] bg-[rgba(255,255,255,0.15)] rounded-full mx-auto mb-[24px]" />

        {/* Header */}
        <div className="flex flex-col items-center gap-[8px] mb-[4px]">
          <div
            className="w-[48px] h-[48px] rounded-[14px] flex items-center justify-center mb-[4px]"
            style={{
              background: 'linear-gradient(135deg, rgba(114,92,247,0.25) 0%, rgba(82,64,201,0.15) 100%)',
              border: '1px solid rgba(114,92,247,0.25)',
              boxShadow: '0 4px 16px rgba(90,60,200,0.2)',
            }}
          >
            <div className="w-[28px]">
              <Image src="/Lucidify Umbrella.png" alt="Lucidify" layout="responsive" width={0} height={0} />
            </div>
          </div>
          <h1 className="HeadingFont text-[26px] sm:text-[32px] text-white">Start a <span className="TextGradient">project</span>.</h1>
          <p className="text-[13px] sm:text-[14px] text-center font-light" style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 420 }}>
            Got a vision? Let&apos;s make it real. We&apos;ll reach out within a day.
          </p>
        </div>

        {/* Divider */}
        <div className="w-full h-[1px] my-[24px] sm:my-[28px]" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)' }} />

        {isSubmitted ? (
          <div className="flex flex-col items-center gap-[12px] py-[40px]">
            <div
              className="w-[56px] h-[56px] rounded-full flex items-center justify-center"
              style={{ background: 'rgba(114,92,247,0.15)', border: '1px solid rgba(114,92,247,0.3)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#998BF9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-[18px] text-white font-medium">We&apos;ll be in touch soon!</h3>
            <p className="text-[14px] text-center" style={{ color: 'rgba(255,255,255,0.45)' }}>Thanks for reaching out. Expect a reply within 24 hours.</p>
          </div>
        ) : (
          <form className="flex flex-col gap-[18px] sm:gap-[22px] w-full sm:w-[580px]" onSubmit={handleSubmit}>
            <div className="flex flex-col sm:flex-row gap-[18px] sm:gap-[20px]">
              <div className="flex flex-col flex-1 gap-[6px]">
                <label htmlFor="firstName" className="text-[12px] font-medium tracking-[0.5px]" style={{ color: 'rgba(255,255,255,0.55)' }}>FIRST NAME</label>
                <input type="text" id="firstName" placeholder="Your first name" value={formData.firstName} onChange={handleInputChange} className={inputClass} style={inputStyle} required />
              </div>
              <div className="flex flex-col flex-1 gap-[6px]">
                <label htmlFor="lastName" className="text-[12px] font-medium tracking-[0.5px]" style={{ color: 'rgba(255,255,255,0.55)' }}>LAST NAME</label>
                <input type="text" id="lastName" placeholder="Your last name" value={formData.lastName} onChange={handleInputChange} className={inputClass} style={inputStyle} required />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-[18px] sm:gap-[20px]">
              <div className="flex flex-col flex-1 gap-[6px]">
                <label htmlFor="email" className="text-[12px] font-medium tracking-[0.5px]" style={{ color: 'rgba(255,255,255,0.55)' }}>EMAIL</label>
                <input type="email" id="email" placeholder="your@email.com" value={formData.email} onChange={handleInputChange} className={inputClass} style={inputStyle} required />
              </div>
              <div className="flex flex-col flex-1 gap-[6px]">
                <label htmlFor="phone" className="text-[12px] font-medium tracking-[0.5px]" style={{ color: 'rgba(255,255,255,0.55)' }}>PHONE</label>
                <input type="tel" id="phone" placeholder="+1 (555) 000-0000" value={formData.phone} onChange={handleInputChange} className={inputClass} style={inputStyle} required />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-[18px] sm:gap-[20px]">
              <div className="flex flex-col flex-1 gap-[6px]">
                <label htmlFor="companyName" className="text-[12px] font-medium tracking-[0.5px]" style={{ color: 'rgba(255,255,255,0.55)' }}>COMPANY NAME</label>
                <input type="text" id="companyName" placeholder="Your company (optional)" value={formData.companyName} onChange={handleInputChange} className={inputClass} style={inputStyle} />
              </div>
              <div className="flex flex-col flex-1 gap-[6px]">
                <label htmlFor="industry" className="text-[12px] font-medium tracking-[0.5px]" style={{ color: 'rgba(255,255,255,0.55)' }}>INDUSTRY</label>
                <input type="text" id="industry" placeholder="e.g. Finance, Tech" value={formData.industry} onChange={handleInputChange} className={inputClass} style={inputStyle} />
              </div>
            </div>

            <div className="flex flex-col gap-[6px]">
              <label htmlFor="projectDetails" className="text-[12px] font-medium tracking-[0.5px]" style={{ color: 'rgba(255,255,255,0.55)' }}>PROJECT DETAILS</label>
              <textarea id="projectDetails" placeholder="Tell us about your vision..." value={formData.projectDetails} onChange={handleInputChange} className={inputClass} style={inputStyle} rows={4} />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="relative w-full rounded-[12px] overflow-hidden py-[12px] text-white font-medium text-[15px] active:scale-[0.99] transition-transform duration-100"
              style={{
                background: 'linear-gradient(135deg, #8B6FFF 0%, #6047F5 50%, #4A2FE0 100%)',
                boxShadow: '0 0 0 1px rgba(114,92,247,0.4), 0 4px 20px rgba(90,60,200,0.35)',
              }}
            >
              <span className="relative z-10">Submit Project Idea</span>
              <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 100%)' }} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Popup;
