import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kiitos palautteesta!",
  description: "Palautteesi on vastaanotettu. Kiitos, että autoit kehittämään Koodaripulaa!",
  alternates: {
    canonical: "/feedback-confirmation",
  },
};

export default function FeedbackConfirmationPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="text-5xl mb-6">🙏</div>
      <h1 className="text-2xl font-semibold text-white mb-3">Kiitos palautteesta!</h1>
      <p className="text-gray-400 mb-8">
        Palautteesi on vastaanotettu. Se auttaa meitä kehittämään Koodaripulaa paremmaksi. Onnea työnhakuun!
      </p>
      <Link
        href="/"
        className="inline-block px-5 py-2.5 rounded-md bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
      >
        Takaisin etusivulle
      </Link>
    </div>
  );
}
