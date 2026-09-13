"use client";
import { useDialog } from '@/hooks/useDialog';

import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { queueNotification } from '@/utils/notifications';
import { db } from '../firebaseConfig'; // Adjust the path as needed
import { useAuth } from '@/context/authContext'; // Import your AuthContext
import { useRouter } from 'next/navigation';    // Import Next.js router
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Import Firebase Storage

interface CreateWebDesignPopupProps {
    closeCreatProjectPopup: () => void;
    isVisible: boolean;
    projectId: string; // Add projectId to the props
    userId: string;
    onDesignAdded?: () => void;
}

interface FormData {
    designName: string;
    designDescription: string;
    designURL: string;
    designPage: "Sections" | "Full-Page" | "";
    designType: string;
    dateCreated: string;
    selectedDesign: boolean;
}

// Function to get the ordinal suffix
const getOrdinal = (n: number): string => {
    const suffixes = ["th", "st", "nd", "rd"];
    const value = n % 100;
    return suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0];
};

const CreateWebDesignPopup: React.FC<CreateWebDesignPopupProps> = ({ closeCreatProjectPopup, isVisible, projectId, userId, onDesignAdded }) => {
    const { user } = useAuth();  // Access the authenticated user
    const router = useRouter();  // Access the router

    // Redirect to login if there's no user
    useEffect(() => {
        if (!user) {
            router.push("/login");  // Redirect the user to the login page
        }
    }, [user, router]);

    const [formData, setFormData] = useState<FormData>({
        designName: '',
        designDescription: '',
        designURL: '',
        designPage: '',
        designType: '',
        dateCreated: new Date().toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).replace(/(\d+)/, (match) => `${match}${getOrdinal(parseInt(match))}`), // Append ordinal suffix
        selectedDesign: false,
    });

    const designPages = ["Sections", "Full-Page"] as const; // 'as const' makes this a readonly tuple of literal types


    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { if (isVisible) { setError(''); setFormData({ designName: '', designDescription: '', designURL: '', designPage: '', designType: '', dateCreated: new Date().toISOString(), selectedDesign: false }); } }, [isVisible]);

    // Handle form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [id]: value,
        }));
    };

    // Handle designType toggle (button acting like a radio button, only one designType can be selected)
    const handleDesignTypeToggle = (type: string) => {
        setFormData(prev => ({
            ...prev,
            designType: prev.designType === type ? "" : type // toggle string
        }));
    };

    // Handle designType toggle (button acting like a radio button, only one designType can be selected)
    const handleDesignPageToggle = (page: "Sections" | "Full-Page") => {
        setFormData(prev => ({
            ...prev,
            designPage: prev.designPage === page ? "" : page // toggle string
        }));
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || submitting || uploading) return;
        if (!formData.designPage || !formData.designName.trim() || !formData.designURL) { setError('Add a design name, choose its page type, and upload an image first.'); return; }
        setSubmitting(true); setError('');
        try {
            const subCollection = formData.designPage === 'Sections' ? 'section web designs' : 'full-page web designs';
            const batch = writeBatch(db);
            batch.set(doc(collection(db, 'users', userId, 'projects', projectId, subCollection)), { ...formData, designName: formData.designName.trim(), dateCreated: new Date().toISOString() });
            queueNotification(batch, userId, 'New design uploaded', `${formData.designName.trim()} is ready to review.`, 'upload', projectId, `/dashboard/projects/${projectId}/uploads`);
            await batch.commit();
            onDesignAdded?.(); closeCreatProjectPopup();
        } catch { setError('Could not save this design. Please try again.'); }
        finally { setSubmitting(false); }
    };

    // Handle file upload for attachments
    // Handle file upload for attachments using Cloudinary
    // Handle file upload for attachments using Cloudinary
    // Handle Logo Upload
    const handleDesignUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files ? e.target.files[0] : null;

        if (file && user && !uploading && !submitting) {
            if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { setError('Choose an image smaller than 10 MB.'); return; }
            setUploading(true); setError('');
            try {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("upload_preset", "Unsigned Presets"); // Replace with your Cloudinary upload preset

                // Set the folder path for the logo inside the user's UID folder
                const folderPath = `users/${userId}/webDesigns`; // Logo-specific folder path
                formData.append("folder", folderPath); // Specify the folder in Cloudinary

                // Send the file to Cloudinary
                const response = await fetch("https://api.cloudinary.com/v1_1/dldxkfbz4/image/upload", {
                    method: "POST",
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    const downloadURL = data.secure_url;
                    if (!downloadURL) throw new Error('Missing uploaded image'); // Get the uploaded file's URL

                    // Optionally, store the URL in your form data or handle accordingly
                    setFormData((prevState) => ({
                        ...prevState,
                        designURL: downloadURL, // Save the logo URL in the form data
                    }));

                    console.log("Logo uploaded successfully:", downloadURL); // Log URL for debugging
                } else {
                    throw new Error('Upload failed');
                }
            } catch (error) {
                setError('Image upload failed. Please try again.');
            } finally {
                setUploading(false);
            }
        } else {
            console.error("No logo file selected or user is not logged in.");
        }
    };


    const dialogRef = useDialog<HTMLFormElement>(isVisible, closeCreatProjectPopup, submitting || uploading);
    if (!isVisible) return null;
    return (
        <div
            className={`h-screen bg-black bg-opacity-50 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none translate-y-[50px]'} fixed inset-0 flex justify-center items-center z-[55]`}
        >
            <form ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Create a web design"
                className="DashboardDialog relative flex w-[min(650px,94vw)] max-h-[90dvh] BlackScrollbar overflow-y-auto flex-col items-start px-[24px] sm:px-[50px] py-5 BlackGradient ContentCardShadow rounded-[50px]"
                onSubmit={handleSubmit}
            >
                {error && <p role="alert" className="DashboardNotice">{error}</p>}
                {uploading && <p role="status">Uploading image…</p>}
                {formData.designURL && <p role="status" className="text-sm mb-3">Image uploaded ✓</p>}
                <div className="inline-flex items-center justify-center gap-5 ">
                    <div className="w-[50px]">
                        <Image
                            src="/Lucidify Umbrella.png"
                            alt="Lucidify Logo"

                            width={64}
                            height={64}
                        />
                    </div>
                    <div className=" font-semibold  text-[24px] sm:text-[30px] leading-[normal]">
                        Create a Web Design.
                    </div>
                </div>
                <button type="button" aria-label="Close design form" disabled={submitting || uploading} onClick={closeCreatProjectPopup} className="absolute top-4 right-5 w-9 h-9 rounded-full DashboardChoice">✕</button>

                <div className="w-full my-[15px] opacity-25 border-[1.5px] border-[#808080] rounded-full" />

                <div className="inline-flex flex-col items-start gap-[50px] mb-[25px]">
                    <div className="inline-flex flex-col items-start gap-2.5">
                        <div className="font-semibold text-xl">Web Design Details</div>
                        <div className="flex items-start gap-[15px] w-full">
                            <div className="inline-flex items-start gap-2.5 self-stretch">
                                <div className={`flex w-[30px] h-[30px] items-center justify-center gap-2.5 rounded-[100px] ${formData.designName && formData.designDescription ? "bg-[#725CF7] PopupAttentionShadow" : "bg-[#2A2A2D] ContentCardShadow"}`}>
                                    <div>1</div>
                                </div>
                                <div className="w-0.5 bg-[#80808040] rounded-[100px]" />
                            </div>
                            <div className="flex flex-wrap w-full items-center justify-between gap-[15px_15px]">
                                {/* Upload Logo */}
                                <div className="flex flex-col w-full items-start gap-[13px]">
                                    <div className="text-sm leading-[normal]">Upload Design<span className="text-[#998af8] text-[16px] font-bold">*</span></div>
                                    <div className="flex max-h-[38px] h-[38px] items-center gap-[19px] px-0 py-2.5 w-full rounded-[10px]">
                                        <div className="flex w-[38px] h-[38px] items-center justify-center gap-2.5 rounded-[100px] BlackWithLightGradient ContentCardShadow">
                                            <div className="w-[20px]">
                                                <Image src="/Upload Icon.png" alt="Upload Icon" width={64} height={64} style={{ width: "100%", height: "auto" }} />
                                            </div>
                                        </div>
                                        <label className="flex-1 min-w-0 text-xs leading-[normal] cursor-pointer">
                                            <span className="font-normal text-xs">Choose an image (up to 10 MB). </span>
                                            <span className="underline">Choose file</span>
                                            <input
                                                type="file"
                                                className="hidden" aria-label="Design image"
                                                onChange={handleDesignUpload}
                                                accept="image/*" disabled={uploading || submitting}
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Project Name */}
                                <div className="flex flex-col w-full items-start gap-[13px]">
                                    <p className="text-sm">
                                        Design Name<span className="text-[#998af8] text-[16px] font-bold">*</span>
                                    </p>
                                    <input
                                        id="designName" aria-label="Design name"
                                        type="text"
                                        value={formData.designName}
                                        onChange={handleInputChange}
                                        placeholder="Modern Homepage Redesign"
                                        required
                                        className="max-h-[38px] w-full rounded-[10px] px-[17px] py-2.5 LightGrayGradient ContentCardShadow text-xs"
                                    />
                                </div>



                                {/* Project Description */}
                                <div className="flex flex-col w-full items-start gap-[13px]">
                                    <p className="text-sm">
                                        Design Description<span className="text-[#998af8] text-[16px] font-bold">*</span>
                                    </p>
                                    <input
                                        id="designDescription" aria-label="Design description"
                                        value={formData.designDescription}
                                        onChange={handleInputChange}
                                        placeholder="Professional sleek design of a homepage, involving a homepage moving video and SSR."
                                        required
                                        className="max-h-14 w-full rounded-[10px] px-[17px] py-2.5 LightGrayGradient ContentCardShadow text-xs"
                                    />
                                </div>
                                {/* designTypes Section */}
                                <div className="inline-flex flex-col w-full items-start gap-2.5">
                                    <p className="text-sm">
                                        Design Page<span className="text-[#998af8] text-[16px] font-bold">*</span>
                                    </p>
                                    <div className="flex flex-wrap gap-[15px_20px] w-full justify-start">
                                        {designPages.map((page) => (
                                            <button
                                                key={page}
                                                type="button" aria-pressed={formData.designPage === page}
                                                onClick={() => handleDesignPageToggle(page)}
                                                className={`DashboardChoice px-4 py-2 rounded-[10px] text-white text-[12px] ${formData.designPage === page
                                                    ? 'bg-[#725CF7] PopupAttentionShadow'
                                                    : 'bg-[#2A2A2D] ContentCardShadow'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {/* designTypes Section */}
                                <div className="inline-flex flex-col items-start gap-2.5">
                                    <p className="text-sm">
                                        Design Type<span className="text-[#998af8] text-[16px] font-bold">*</span>
                                    </p>
                                    <div className="flex flex-wrap gap-[15px_20px] w-full justify-start">
                                        {['Homepage', 'About', 'Services', 'Contact', 'Testimonials', 'FAQ', 'Pricing', 'Gallery', 'Events', 'Menu', 'Online Ordering', 'Reservations', 'Our Team', 'Blog', 'Portfolio', 'Support', 'Log in', 'Sign up', 'Social Media'].map((designType) => (
                                            <button
                                                type="button"
                                                key={designType} aria-pressed={formData.designType === designType}
                                                onClick={() => handleDesignTypeToggle(designType)}
                                                className={`DashboardChoice px-4 py-2 rounded-[10px] text-white text-[12px] ${formData.designType === designType
                                                    ? 'bg-[#725CF7] PopupAttentionShadow'
                                                    : 'bg-[#2A2A2D] ContentCardShadow'
                                                    }`}
                                            >
                                                {designType}
                                            </button>
                                        ))}
                                    </div>
                                </div>


                            </div>
                        </div>
                    </div>

                </div>
                <button
                    type="submit"
                    className={`py-[8px] w-full inline-flex items-center justify-center text-[16px] rounded-[10px] ${formData.designName && formData.designDescription && formData.designURL && formData.designPage && formData.designType ? "PopupAttentionGradient PopupAttentionShadow" : "PopupAttentionGradient ContentCardShadow opacity-50"}`}
                    disabled={submitting || uploading || !formData.designName || !formData.designDescription || !formData.designURL || !formData.designType || !formData.designPage}
                >
                    Create Web Design
                </button>
            </form>
        </div>
    );
};

export default CreateWebDesignPopup;