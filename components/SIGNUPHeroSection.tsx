"use client"

import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth } from '../firebaseConfig';
import Link from 'next/link';
import { authErrorMessage } from '@/utils/authErrors';
import { useTheme } from '@/context/themeContext';

const SIGNUPHeroSection = () => {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [password2, setPassword2] = useState<string>("");
  const [error, setError] = useState<string | string[] | null>(null);
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  // Signing up never watches for an existing session. Someone who is already signed in — or who
  // signed in on this device before — still gets the form, so they can create another account.
  // Only logging in resumes a recent session. Each handler below navigates on its own success.
  useEffect(() => { setTheme('light'); }, [setTheme]);

  const handleGoogleSignUp = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      // The dashboard guard sends a brand-new account on to /signup/get-started.
      router.replace("/dashboard");
    } catch (error) {
      setError(authErrorMessage(error));
      setSubmitting(false);
    }
  };

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const handleEmailSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    const errors: string[] = [];
    if (!isValidEmail(email)) errors.push("Enter a valid email address.");
    if (password.length < 8) errors.push("Password must be at least 8 characters.");
    if (!/\d/.test(password)) errors.push("Password must include at least one number.");
    if (password !== password2) errors.push("Passwords must match.");
    if (errors.length) { setError(errors); return; }
    setSubmitting(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/dashboard");
    } catch (error) {
      setError(authErrorMessage(error));
      setSubmitting(false);
    }
  };

  // Move to the next step with animation
  const handleContinue = () => {
    setStep(2);  // Switch to step 2
    setTimeout(() => {

      const section1 = document.getElementById("SignUpSection1");
      const section2 = document.getElementById("SignUpSection2");


      // Check if section2 exists before accessing its properties
      if (section2) {
        section2.style.transform = "translateX(0)";
        section2.style.opacity = "1";
      }
    }, 0);  // Small delay to ensure animation triggers smoothly
  };

  // Move to the previous step with animation
  const handleBack = () => {
    setStep(1);  // Switch to step 2
    setTimeout(() => {

      const section1 = document.getElementById("SignUpSection1");
      const section2 = document.getElementById("SignUpSection2");


      // Check if section2 exists before accessing its properties
      if (section2) {
        section2.style.transform = "translateX(300px)";
        section2.style.opacity = "0";
      }
    }, 0);  // Small delay to ensure animation triggers smoothly
  };


  return (
    <div className="relative flex justify-center items-center min-h-screen BackgroundGradient FullPageBg overflow-clip px-4">
      {/* Left Decorative Image */}
      <div className="pointer-events-none hidden lg:block w-[18%] absolute left-[10%] top-[27%] my-auto z-10">
        <Image
          src="/3D Astronaut.png"
          alt="Left Decorative Image"
          layout="responsive"
          width={0}
          height={0}
        />
      </div>

      {/* Right Decorative Image */}
      <div className="pointer-events-none hidden lg:block -right-[17%] bottom-[57%] w-[50%] absolute">
        <Image
          src="/3D Earth.png"
          alt="Right Decorative Image"
          layout="responsive"
          width={0}
          height={0}
        />
      </div>

      {/* Signup Form */}
      <div className={`relative w-full max-w-[500px] z-10 bg-gradient-to-br from-[#d6ceff] via-white/100 to-white rounded-[30px] text-center RegBoxShadow`}>
        {/* Rocket Icon */}
        <div className="hidden sm:block w-[113px] absolute -top-[120px] -left-[10%] transform -translate-x-1/2">
          <Image
            src="/3D Invis Rocket.png"
            alt="Rocket Decorative Image"
            layout="responsive"
            width={0}
            height={0}
          />
        </div>

        <div
          className="transition-transform duration-500 ease-in-out overflow-x-hidden px-[1px]"
        >
          {step === 1 && (
            <div id="SignUpSection1" className="px-6 sm:px-8 py-10">

              {/* Step 1: Google Signup or Email Input */}
              <div className="flex flex-col items-center mb-[40px]">
                <h1 className="text-[26px] font-semibold text-black mb-[6px]">Create an Account</h1>
                <h3 className="text-black text-[15px] text-center opacity-65">Sign up to Lucidify & start growing your business!</h3>
              </div>

              {/* Google Sign-Up Button */}
              <button
                onClick={handleGoogleSignUp}
                disabled={submitting}
                className="text-white w-full bg-[rgba(0,0,0,1)] hover:bg-[rgba(0,0,0,0.80)] py-2 rounded-lg flex items-center justify-center ThreeD mb-4"
              >
                <div className="w-[15px] mr-[10px]">
                  <Image
                    src="/Google Icon.png"
                    alt="Google Icon"
                    layout="responsive"
                    width={0}
                    height={0}
                  />
                </div>
                Sign up with Google
              </button>

              <div className="flex items-center mb-[25px] mt-[30px]">
                <div className="h-[1px] bg-gray-300 w-[100%]"></div>
                <p className="text-gray-500 mx-[10px]">or</p>
                <div className="h-[1px] bg-gray-300 w-[100%]"></div>
              </div>

              {error && <p role="alert" className="AuthError mb-4">{Array.isArray(error) ? error.join(" ") : error}</p>}

              {/* Email Input and Continue Button */}
              <div className="flex flex-col items-start">
                <h3 className="text-black text-[14px] font-medium">Email</h3>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-black bg-[rgba(255,255,255,0.10)] shadow-sm shadow-gray-400 rounded-lg p-2 mt-[3px] focus:outline-none focus:ring-1 focus:ring-[rgba(0,0,0,0.25)]"
                  required
                />
              </div>

              <button
                className={`w-full ${isValidEmail(email) ? "text-white" : "text-[rgba(0,0,0,0.5)]"} py-2 mt-[20px] rounded-lg bg-${isValidEmail(email) ? "[#725CF7]" : "[rgba(114,92,247,0.5)]"} shadow-lg shadow-indigo-300 ${isValidEmail(email) && "hover:bg-[#5D3AEA]"}`}
                onClick={handleContinue}  // Trigger transition
                disabled={!isValidEmail(email)}  // Disable if invalid email
              >
                Continue
              </button>

              <p className="text-gray-500 text-[14px] mt-[40px]">
                Already have an account? <Link href="/login" className="text-black font-medium hover:text-opacity-70">Log In</Link>
              </p>
            </div>
          )}



          {step === 2 && (
            <div className="translate-x-[300px] opacity-0 px-6 sm:px-8 py-10" id="SignUpSection2">
              {/* Step 2: Password Input */}
              <div className="flex flex-col items-center mb-[40px]">
                <h1 className="text-[26px] font-semibold text-black mb-[6px]">Almost There!</h1>
                <h3 className="text-black text-[15px] text-center opacity-65">Enter your password to complete your sign-up.</h3>
              </div>

              {/* Email/Password Sign-Up Form */}
              <form onSubmit={handleEmailSignUp}>
                <div className="flex flex-col items-start mb-[20px]">
                  <h3 className="text-black text-[14px] font-medium">Password</h3>
                  <input
                    type="password"
                    placeholder="Password (min. 8 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-black bg-[rgba(255,255,255,0.10)] shadow-sm shadow-gray-400 rounded-lg p-2 mt-[3px] focus:outline-none focus:ring-1 focus:ring-[rgba(0,0,0,0.25)]"
                    required
                  />
                  <div className="text-black opacity-70 text-[13px] font-light mt-[10px]">Must contain a number.</div>
                </div>
                <div className="flex flex-col items-start">
                  <h3 className="text-black text-[14px] font-medium">Retype Password</h3>
                  <input
                    type="password"
                    placeholder="Password (min. 8 characters)"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    className="w-full text-black bg-[rgba(255,255,255,0.10)] shadow-sm shadow-gray-400 rounded-lg p-2 mt-[3px] focus:outline-none focus:ring-1 focus:ring-[rgba(0,0,0,0.25)]"
                    required
                  />
                </div>

                {error && (
                  <div role="alert" className="AuthError flex flex-col gap-2 mt-4 items-start">
                    {Array.isArray(error)
                      ? error.map((err, index) => (
                        <p key={index} className="AuthError text-[14px]">
                          {err}
                        </p>
                      ))
                      : <p className="AuthError text-[14px]">{error}</p>}
                  </div>
                )}


                <div className="flex justify-between mt-[30px]">
                  <button
                    type="button"
                    onClick={handleBack}
                    className={`w-[28%] text-black py-[10px] rounded-lg bg-transparent flex items-center justify-center gap-[4px] opacity-60 hover:opacity-100 GoHomeText`}>
                    <div className="w-[10px] GoHomeArrow">
                      <Image
                        src="/Black Left Arrow.png"
                        alt="Black Left Arrow"
                        layout="responsive"
                        width={0}
                        height={0}
                      />
                    </div>
                    Go Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !password || password !== password2}
                    className={`w-[70%] ${(!password || password !== password2) ? "text-[rgba(0,0,0,0.5)]" : "text-white"} py-[10px] rounded-lg ${(!password || password !== password2) ? "bg-[rgba(114,92,247,0.5)]" : "bg-[#725CF7]"} shadow-lg shadow-indigo-300 ${(password && password === password2) && "hover:bg-[#5D3AEA]"}`}
                  >
                    Complete Sign Up
                  </button>
                </div>

              </form>


            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SIGNUPHeroSection;
