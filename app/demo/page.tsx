import DEMOPage from "@/components/DEMOPage";
import Footer from "@/components/Footer";
import Main from "@/components/Main";
import Navbar from "@/components/Navbar";

export default function DemoPage() {
    return (
        <>
            <Navbar />
            <Main>
                <DEMOPage />
            </Main>
            <Footer />
        </>
    );
}
