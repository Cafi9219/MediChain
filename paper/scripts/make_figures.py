"""Generate standalone diagrams (PDF + PNG) for the MediChain paper.
Diagrams only -- no measured results are drawn here.
Run:  python3 scripts/make_figures.py
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Polygon

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "figures")
os.makedirs(OUT, exist_ok=True)

BLUE, GREEN, ORANGE, GREY = "#dbe7f7", "#dcf2dc", "#fde5c8", "#eeeeee"
RED, AMBER, GRN = "#f4b6b0", "#fbe9a6", "#bfe5bf"


def canvas(w, h):
    fig, ax = plt.subplots(figsize=(w, h))
    ax.set_xlim(0, w * 10)
    ax.set_ylim(0, h * 10)
    ax.axis("off")
    return fig, ax


def box(ax, x, y, w, h, text, fc=GREY, dashed=False, fs=8.5):
    p = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.4,rounding_size=1.2",
                       fc=fc, ec="black", lw=1.1, ls="--" if dashed else "-")
    ax.add_patch(p)
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs)
    return (x, y, w, h)


def arrow(ax, p, q, dashed=False, text=None, fs=7.5):
    a = FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=11, lw=1.2,
                        ls="--" if dashed else "-", color="black",
                        shrinkA=0, shrinkB=0)
    ax.add_patch(a)
    if text:
        ax.text((p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + 1.3, text,
                ha="center", fontsize=fs)


def save(fig, name):
    for ext in ("pdf", "png"):
        fig.savefig(os.path.join(OUT, f"{name}.{ext}"), dpi=300,
                    bbox_inches="tight")
    plt.close(fig)


# 1 ---- architecture -------------------------------------------------
def architecture():
    fig, ax = canvas(10, 6.2)
    names = [("CIFV\nIntake &\nforensic verification", 2),
             ("SROPS\nSurgical retrieval\n& preservation", 27),
             ("CTORB\nRegulator &\naudit board", 52)]
    tops = []
    for t, x in names:
        tops.append(box(ax, x, 46, 21, 11, t, BLUE))
    rt = box(ax, 77, 46, 21, 11, "RTCN\nRecipient hospital\n(restricted)", BLUE, True)
    led = box(ax, 20, 22, 50, 12,
              "Permissioned ledger (PoA-style)\nblocks | SHA-256 Merkle roots | 2-of-3 ECDSA gate", GREEN)
    eng = box(ax, 32, 4, 26, 9, "Deadline engine\n(scan every 30 s)", ORANGE)
    store = box(ax, 2, 4, 22, 9, "Off-chain store\n(biometrics, images)", ORANGE, True)
    route = box(ax, 66, 4, 30, 9, "Route service\nOSRM / Haversine fallback", ORANGE)
    arrow(ax, (12.5, 46), (28, 34))
    arrow(ax, (37.5, 46), (45, 34))
    arrow(ax, (62.5, 46), (60, 34))
    arrow(ax, (87.5, 46), (70, 30), dashed=True)
    arrow(ax, (45, 13), (45, 22))
    arrow(ax, (66, 8.5), (58, 8.5))
    arrow(ax, (24, 8.5), (30, 22), dashed=True)
    ax.text(50, 61, "MediChain consortium architecture", ha="center",
            fontsize=11, fontweight="bold")
    ax.text(50, 59.0, "solid = on-chain read/write   dashed = off-chain / restricted interface",
            ha="center", fontsize=7.5, style="italic")
    save(fig, "fig_architecture")


# 2 ---- 2-of-3 threshold flow ----------------------------------------
def threshold():
    fig, ax = canvas(10, 5.2)
    box(ax, 1, 28, 17, 10, "Milestone d\npayload P_d", GREY)
    box(ax, 22, 28, 20, 10, "Digest\nm_d = H(type || H(P_d)\n|| dept || nonce)", BLUE, fs=7.5)
    box(ax, 47, 36, 17, 8, "Specialist 1\nSign(sk_1, m_d)", ORANGE, fs=7.5)
    box(ax, 47, 26, 17, 8, "Specialist 2\nSign(sk_2, m_d)", ORANGE, fs=7.5)
    box(ax, 47, 16, 17, 8, "Specialist 3\n(optional)", ORANGE, True, fs=7.5)
    box(ax, 69, 24, 14, 18, "Checks\n1 authorised?\n2 duplicate?\n3 Verify(pk,m,sig)", BLUE, fs=7.5)
    box(ax, 87, 32, 11, 10, "|V| >= 2\ncommit block", GRN, fs=7.5)
    box(ax, 87, 16, 11, 10, "|V| < 2\npending", RED, fs=7.5)
    arrow(ax, (18, 33), (22, 33))
    arrow(ax, (42, 33), (47, 40))
    arrow(ax, (42, 33), (47, 30))
    arrow(ax, (42, 33), (47, 20), dashed=True)
    for y in (40, 30, 20):
        arrow(ax, (64, y), (69, 33 if y > 25 else 28), dashed=(y == 20))
    arrow(ax, (83, 36), (87, 37))
    arrow(ax, (83, 28), (87, 21))
    ax.text(50, 49, "k-of-n threshold verification (k = 2, n = 3)",
            ha="center", fontsize=11, fontweight="bold")
    save(fig, "fig_threshold_flow")


# 3 ---- deadline state machine ---------------------------------------
def deadline():
    fig, ax = canvas(10, 4.6)
    box(ax, 2, 26, 21, 10, "GREEN\nrho >= 0.50", GRN, fs=8)
    box(ax, 26, 26, 21, 10, "AMBER\n0.30 <= rho < 0.50", AMBER, fs=8)
    box(ax, 50, 26, 21, 10, "RED (Critical)\n0 < rho < 0.30", RED, fs=8)
    box(ax, 74, 26, 23, 10, "RED (Overdue)\nrho <= 0", RED, fs=8)
    arrow(ax, (23, 31), (26, 31), text="time")
    arrow(ax, (47, 31), (50, 31), text="time")
    arrow(ax, (71, 31), (74, 31), text="time")
    box(ax, 42, 6, 28, 9, "append signed ESCALATION\ntransaction (once per record+status)", ORANGE, fs=7.5)
    box(ax, 72, 6, 26, 9, "milestone completes while rho <= 0\n-> signed LATE_EVENT tx", ORANGE, True, fs=7.5)
    arrow(ax, (58, 26), (56, 15))
    arrow(ax, (85, 26), (85, 15), dashed=True)
    ax.text(50, 43, "Deadline classification (advisory; never lowers the 2-of-3 rule)",
            ha="center", fontsize=10.5, fontweight="bold")
    ax.text(50, 39.5, "scan on every state transition and every 30 s", ha="center",
            fontsize=8, style="italic")
    save(fig, "fig_deadline_states")


# 4 ---- ETA pipeline --------------------------------------------------
def eta():
    fig, ax = canvas(10, 5.6)
    box(ax, 1, 24, 14, 10, "Origin,\ndestination", GREY)
    box(ax, 19, 24, 14, 10, "OSRM\nrequest", BLUE)
    d = Polygon([(46, 29), (53, 35), (60, 29), (53, 23)], closed=True, fc=GREY, ec="black", lw=1.1)
    ax.add_patch(d)
    ax.text(53, 29, "reply\nok?", ha="center", va="center", fontsize=8)
    box(ax, 48, 38, 26, 8, "road distance, duration", BLUE, fs=8)
    box(ax, 48, 8, 26, 9, "Haversine fallback\nkappa * g / v", ORANGE, fs=8)
    d2 = Polygon([(80, 29), (86, 35), (92, 29), (86, 23)], closed=True, fc=GRN, ec="black", lw=1.1)
    ax.add_patch(d2)
    ax.text(86, 29, "mu >= 0?", ha="center", va="center", fontsize=8)
    box(ax, 78, 8, 20, 9, "ETA_RECORDED\non ledger (+SHA-256)", GRN, fs=7.5)
    arrow(ax, (15, 29), (19, 29)); arrow(ax, (33, 29), (46, 29))
    arrow(ax, (53, 35), (53, 38), text=None); ax.text(55, 36.3, "yes", fontsize=7.5)
    arrow(ax, (53, 23), (53, 17)); ax.text(55, 20, "no", fontsize=7.5)
    arrow(ax, (74, 42), (86, 35)); arrow(ax, (74, 12), (80, 29), )
    arrow(ax, (86, 23), (88, 17)); ax.text(90.5, 20.5, "feasible", fontsize=7)
    ax.text(86, 40.5, "mu < 0: infeasible-route flag", ha="center", fontsize=7.5, color="#a02020")
    ax.text(50, 54, "Route-based ETA with fallback and viability check",
            ha="center", fontsize=11, fontweight="bold")
    ax.text(86, 20.5 - 7.5, "", fontsize=1)
    save(fig, "fig_eta_pipeline")


# 5 ---- block / ledger structure -------------------------------------
def blocks():
    fig, ax = canvas(10, 3.6)
    xs = [2, 35, 68]
    for i, x in enumerate(xs):
        box(ax, x, 6, 30, 22,
            f"Block {i + 1}\nprev_hash | timestamp\nMerkle root (SHA-256)\ntx: INTAKE / HARVEST /\nESCALATION / ETA_RECORDED\nsignatures (>= 2 for gates)",
            GREEN, fs=7.5)
    arrow(ax, (32, 17), (35, 17)); arrow(ax, (65, 17), (68, 17))
    ax.text(50, 33, "Ledger structure: hash-linked blocks with Merkle-rooted transactions",
            ha="center", fontsize=10.5, fontweight="bold")
    save(fig, "fig_ledger_blocks")


# 6 ---- roles / workflow swimlane ------------------------------------
def workflow():
    fig, ax = canvas(10, 4.6)
    lanes = [("CIFV", 34), ("SROPS", 22), ("CTORB", 10)]
    for n, y in lanes:
        ax.add_patch(plt.Rectangle((0, y - 1), 100, 10, fc="none", ec="#999999", lw=0.8))
        ax.text(1, y + 4, n, fontsize=9, fontweight="bold", va="center")
    s1 = box(ax, 10, 35, 17, 7, "Donor intake +\nbiometrics + consent", BLUE, fs=7)
    s2 = box(ax, 31, 35, 17, 7, "2-of-3 intake\nclearance", GRN, fs=7)
    s3 = box(ax, 40, 23, 17, 7, "Organ recovery\nrecord + IDs", BLUE, fs=7)
    s4 = box(ax, 61, 23, 17, 7, "2-of-3 recovery\ncertification", GRN, fs=7)
    s5 = box(ax, 70, 11, 17, 7, "Inventory, ETA,\naudit explorer", BLUE, fs=7)
    arrow(ax, (27, 38.5), (31, 38.5))
    arrow(ax, (48, 38.5), (48.5, 30))
    arrow(ax, (57, 26.5), (61, 26.5))
    arrow(ax, (78, 26.5), (78.5, 18))
    ax.text(50, 49, "End-to-end cadaveric workflow across consortium roles",
            ha="center", fontsize=11, fontweight="bold")
    save(fig, "fig_workflow_swimlane")


# 7 ---- evaluation map (design, no numbers) --------------------------
def evalmap():
    fig, ax = canvas(10, 3.8)
    rows = [("E1", "Approval latency +\nattack rejection", "RQ1"),
            ("E2", "Deadline engine\naccuracy + delay", "RQ2"),
            ("E3", "Ledger throughput\n+ save time", "RQ3"),
            ("E4", "Transit ETA error\n(MAE, MAPE)", "RQ4"),
            ("E5", "Viability flag\nprecision/recall", "RQ5")]
    for i, (e, t, rq) in enumerate(rows):
        x = 1 + i * 19.5
        box(ax, x, 14, 17, 12, f"{e}\n{t}", BLUE, fs=7.5)
        box(ax, x + 3, 2, 11, 6, rq, GRN, fs=8)
        arrow(ax, (x + 8.5, 14), (x + 8.5, 8))
    ax.text(50, 33, "Evaluation design: experiments mapped to research questions",
            ha="center", fontsize=10.5, fontweight="bold")
    save(fig, "fig_evaluation_map")


for f in (architecture, threshold, deadline, eta, blocks, workflow, evalmap):
    f()
print("figures written to", os.path.abspath(OUT))
