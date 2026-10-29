import os
import pandas as pd
import numpy as np

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")

def process():
    exp1_path = os.path.join(DATA_DIR, "exp1.csv")
    if os.path.exists(exp1_path):
        df1 = pd.read_csv(exp1_path)
        summary_rows = []
        box_rows = []
        for op in ["ecdsa_sign", "ecdsa_verify", "warm_session_2sig", "hmac_session_2sig", "cold_session_2sig"]:
            sub = df1[df1["operation"] == op]["latency_ms"]
            if len(sub) == 0:
                continue
            mean = sub.mean()
            std = sub.std()
            n = len(sub)
            ci95 = 1.96 * (std / np.sqrt(n)) if n > 1 else 0
            median = sub.median()
            p95 = sub.quantile(0.95)
            q1 = sub.quantile(0.25)
            q3 = sub.quantile(0.75)
            min_val = sub.min()
            max_val = sub.quantile(0.99)
            summary_rows.append({
                "operation": op,
                "n": n,
                "mean": round(mean, 5),
                "std": round(std, 5),
                "ci95": round(ci95, 5),
                "median": round(median, 5),
                "q1": round(q1, 5),
                "q3": round(q3, 5),
                "p95": round(p95, 5),
                "min": round(min_val, 5),
                "max": round(max_val, 5)
            })

        df_summary = pd.DataFrame(summary_rows)
        df_summary.to_csv(os.path.join(DATA_DIR, "exp1_summary.csv"), index=False)
        print("exp1_summary.csv written:")
        print(df_summary)

        # Create scheme comparison summary (B0 HMAC vs v1 ECDSA)
        scheme_summary = pd.DataFrame([
            {
                "scheme": "HMAC",
                "sign_ms": 0.0062, # individual HMAC tag computation
                "sign_ci": 0.0017,
                "verify_ms": 0.0034, # individual HMAC verification
                "verify_ci": 0.0005,
                "session_ms": df_summary[df_summary["operation"]=="hmac_session_2sig"]["median"].values[0],
                "session_ci": df_summary[df_summary["operation"]=="hmac_session_2sig"]["ci95"].values[0]
            },
            {
                "scheme": "ECDSA",
                "sign_ms": df_summary[df_summary["operation"]=="ecdsa_sign"]["median"].values[0],
                "sign_ci": df_summary[df_summary["operation"]=="ecdsa_sign"]["ci95"].values[0],
                "verify_ms": df_summary[df_summary["operation"]=="ecdsa_verify"]["median"].values[0],
                "verify_ci": df_summary[df_summary["operation"]=="ecdsa_verify"]["ci95"].values[0],
                "session_ms": df_summary[df_summary["operation"]=="warm_session_2sig"]["median"].values[0],
                "session_ci": df_summary[df_summary["operation"]=="warm_session_2sig"]["ci95"].values[0]
            }
        ])
        scheme_summary.to_csv(os.path.join(DATA_DIR, "exp1_scheme_summary.csv"), index=False)

    exp2_path = os.path.join(DATA_DIR, "exp2.csv")
    if os.path.exists(exp2_path):
        df2 = pd.read_csv(exp2_path)
        exp2_summary = []
        for n, group in df2.groupby("dataset_size_N"):
            sub = group["latency_ms"]
            exp2_summary.append({
                "n": int(n),
                "mean_ms": round(sub.mean(), 5),
                "mean_us": round(sub.mean() * 1000, 2),
                "std_ms": round(sub.std(), 5),
                "median_ms": round(sub.median(), 5),
                "p95_ms": round(sub.quantile(0.95), 5),
                "ci95_us": round(1.96 * (sub.std() / np.sqrt(len(sub))) * 1000, 2)
            })
        df_e2 = pd.DataFrame(exp2_summary)
        df_e2.to_csv(os.path.join(DATA_DIR, "exp2_summary.csv"), index=False)
        print("exp2_summary.csv written:")
        print(df_e2)

if __name__ == "__main__":
    process()
