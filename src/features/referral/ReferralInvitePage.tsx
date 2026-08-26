import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { storeReferralCode } from "../../lib/referralCapture";

/** /convite/:code — guarda o código por 30 dias e manda para cadastro. */
export function ReferralInvitePage() {
  const { code } = useParams<{ code: string }>();

  useEffect(() => {
    if (code) storeReferralCode(code);
  }, [code]);

  return <Navigate to="/comecar" replace />;
}
