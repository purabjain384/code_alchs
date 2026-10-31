"""
MatruRaksha Model Training and Serialization Script
Trains Logistic Regression, Random Forest, XGBoost, and LightGBM using Stratified 5-Fold CV.
Selects the model with highest high-risk recall and serializes to models/model.joblib and models/meta.json.
"""
import os
import sys
import json
import hashlib
import datetime
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, recall_score, f1_score, accuracy_score
from sklearn.utils.class_weight import compute_sample_weight
from sklearn.base import clone
import joblib

try:
    from xgboost import XGBClassifier
    has_xgb = True
except ImportError:
    has_xgb = False

try:
    from lightgbm import LGBMClassifier
    has_lgbm = True
except ImportError:
    has_lgbm = False

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

DATA_DIR  = os.path.join(PROJECT_ROOT, "data", "raw")
MODEL_DIR = os.path.join(PROJECT_ROOT, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

FEATURES = ["Age", "SystolicBP", "DiastolicBP", "BS", "BodyTemp", "HeartRate"]
LABEL_COL = "RiskLevel"
LABEL_MAP = {"low risk": 0, "mid risk": 1, "high risk": 2}
LABEL_NAMES = ["low", "mid", "high"]
N_FOLDS = 5
RANDOM_SEED = 42
HR_MIN = 40

# 1. Locate dataset
candidates = [
    os.path.join(DATA_DIR, "maternal_health_risk_dataset.csv"),
    os.path.join(DATA_DIR, "Maternal Health Risk Data Set.csv"),
    os.path.join(DATA_DIR, "maternal_health_risk.csv"),
]
if os.path.exists(DATA_DIR):
    for f in os.listdir(DATA_DIR):
        if f.lower().endswith(".csv"):
            candidates.insert(0, os.path.join(DATA_DIR, f))

csv_path = None
for c in candidates:
    if os.path.isfile(c):
        csv_path = c
        break

if not csv_path:
    raise FileNotFoundError(f"Could not find dataset in {DATA_DIR}")

print(f"Loading data from: {csv_path}")
df_raw = pd.read_csv(csv_path)
df_raw.columns = df_raw.columns.str.strip()

df = df_raw.copy()
df[LABEL_COL] = df[LABEL_COL].astype(str).str.strip().str.lower()
df["y"] = df[LABEL_COL].map(LABEL_MAP)

# Cleaning
df = df[df["HeartRate"] >= HR_MIN].copy()
df = df.drop_duplicates(subset=FEATURES + [LABEL_COL]).reset_index(drop=True)
df = df.dropna(subset=FEATURES + ["y"]).reset_index(drop=True)

print(f"Clean rows: {len(df)}")
X = df[FEATURES].values.astype(np.float64)
y = df["y"].values.astype(np.int32)

# 2. Models
models = {
    "rf": ("Random Forest", RandomForestClassifier(
        n_estimators=300, max_depth=None, min_samples_split=5, min_samples_leaf=2,
        class_weight="balanced", random_state=RANDOM_SEED, n_jobs=-1
    )),
    "lr": ("Logistic Regression", Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(C=1.0, class_weight="balanced", solver="lbfgs",
                                   max_iter=2000, random_state=RANDOM_SEED))
    ]))
}

if has_xgb:
    models["xgb"] = ("XGBoost", XGBClassifier(
        n_estimators=300, max_depth=6, learning_rate=0.1, eval_metric="mlogloss",
        random_state=RANDOM_SEED, n_jobs=-1
    ))

if has_lgbm:
    models["lgbm"] = ("LightGBM", LGBMClassifier(
        n_estimators=300, max_depth=-1, learning_rate=0.1, class_weight="balanced",
        random_state=RANDOM_SEED, verbose=-1, n_jobs=-1
    ))

# 3. Cross Validation
skf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=RANDOM_SEED)
cv_results = {}
cv_preds = {}

print("\n--- Running 5-Fold Stratified Cross Validation ---")
for key, (name, estimator) in models.items():
    fold_metrics = []
    all_y_true, all_y_pred, all_y_proba = [], [], []

    for fold_idx, (train_idx, val_idx) in enumerate(skf.split(X, y), 1):
        X_tr, X_val = X[train_idx], X[val_idx]
        y_tr, y_val = y[train_idx], y[val_idx]
        clf = clone(estimator)

        if key == "xgb":
            sw = compute_sample_weight("balanced", y_tr)
            clf.fit(X_tr, y_tr, sample_weight=sw)
        else:
            clf.fit(X_tr, y_tr)

        y_pred = clf.predict(X_val)
        y_proba = clf.predict_proba(X_val)
        rec_per_class = recall_score(y_val, y_pred, average=None, labels=[0, 1, 2])

        fold_metrics.append({
            "accuracy": accuracy_score(y_val, y_pred),
            "macro_f1": f1_score(y_val, y_pred, average="macro"),
            "weighted_f1": f1_score(y_val, y_pred, average="weighted"),
            "recall_low": rec_per_class[0],
            "recall_mid": rec_per_class[1],
            "recall_high": rec_per_class[2]
        })
        all_y_true.extend(y_val)
        all_y_pred.extend(y_pred)
        all_y_proba.append(y_proba)

    cv_results[key] = fold_metrics
    cv_preds[key] = (np.array(all_y_true), np.array(all_y_pred), np.vstack(all_y_proba))

# Summary table
summary_rows = []
for key in models:
    df_f = pd.DataFrame(cv_results[key])
    means = df_f.mean()
    stds = df_f.std()
    summary_rows.append({
        "key": key,
        "model": models[key][0],
        "recall_high": round(float(means["recall_high"]), 4),
        "recall_high_std": round(float(stds["recall_high"]), 4),
        "macro_f1": round(float(means["macro_f1"]), 4),
        "accuracy": round(float(means["accuracy"]), 4),
    })

df_compare = pd.DataFrame(summary_rows).sort_values(by="recall_high", ascending=False).reset_index(drop=True)
print("\n" + df_compare.to_string())

# 4. Best model selection
best_key = df_compare.loc[0, "key"]
best_name, best_base = models[best_key]
print(f"\nWinner: {best_name} ({best_key}) with High-Risk Recall = {df_compare.loc[0, 'recall_high']}")

# 5. Train final model on full data
final_model = clone(best_base)
if best_key == "xgb":
    sw_full = compute_sample_weight("balanced", y)
    final_model.fit(X, y, sample_weight=sw_full)
else:
    final_model.fit(X, y)

# 6. Save model and metadata
model_path = os.path.join(MODEL_DIR, "model.joblib")
joblib.dump(final_model, model_path)
print(f"Saved model to: {model_path}")

versioned_path = os.path.join(MODEL_DIR, f"{best_key}_maternal_risk_v1.joblib")
joblib.dump(final_model, versioned_path)

data_hash = hashlib.sha256(df[FEATURES + [LABEL_COL]].to_csv(index=False).encode()).hexdigest()[:16]
meta = {
    "model_key": best_key,
    "model_name": best_name,
    "model_file": "model.joblib",
    "features": FEATURES,
    "label_map": LABEL_MAP,
    "label_names": LABEL_NAMES,
    "n_folds": N_FOLDS,
    "n_samples": int(len(X)),
    "dataset_hash": data_hash,
    "cv_recall_high": float(df_compare.loc[0, "recall_high"]),
    "cv_macro_f1": float(df_compare.loc[0, "macro_f1"]),
    "cv_accuracy": float(df_compare.loc[0, "accuracy"]),
    "trained_at": datetime.datetime.now().isoformat(),
    "random_seed": RANDOM_SEED,
}

meta_path = os.path.join(MODEL_DIR, "meta.json")
with open(meta_path, "w") as f:
    json.dump(meta, f, indent=2)
print(f"Saved metadata to: {meta_path}")

print("\nTraining and artifact serialization complete!")
