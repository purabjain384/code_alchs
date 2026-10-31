"""
MatruRaksha AI — Model Training & Export Script
================================================
Trains 4 classifiers on the UCI Maternal Health Risk dataset,
selects the best by high-risk recall (5-fold Stratified CV),
and saves model.joblib + meta.json into Project1/models/ and backend/Project1/models/.
"""

import json
import os
import shutil
import sys
import urllib.request
from datetime import date

import joblib
import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    make_scorer,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

SEED = 42
np.random.seed(SEED)

FEATURES = ["Age", "SystolicBP", "DiastolicBP", "BS", "BodyTemp", "HeartRate"]
TARGET = "RiskLevel"
LABEL_MAP = {"low risk": 0, "mid risk": 1, "high risk": 2}
CLASS_NAMES = ["low", "mid", "high"]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
REPO_ROOT = os.path.dirname(PROJECT_ROOT)
DATA_DIR = os.path.join(PROJECT_ROOT, "data", "raw")
MODEL_DIR = os.path.join(PROJECT_ROOT, "models")

UCI_CSV_URL = (
    "https://archive.ics.uci.edu/ml/machine-learning-databases/00639/"
    "Maternal%20Health%20Risk%20Data%20Set.csv"
)


def find_or_download_dataset(data_dir: str) -> str:
    """Locate the CSV file in data/raw/ or download from UCI repository."""
    os.makedirs(data_dir, exist_ok=True)
    candidates = [f for f in os.listdir(data_dir) if f.endswith(".csv")]
    if candidates:
        return os.path.join(data_dir, candidates[0])

    target_csv = os.path.join(data_dir, "Maternal Health Risk Data Set.csv")
    print(f"Downloading UCI Maternal Health Risk dataset to {target_csv}...")
    opener = urllib.request.build_opener()
    opener.addheaders = [("User-Agent", "Mozilla/5.0")]
    urllib.request.install_opener(opener)
    urllib.request.urlretrieve(UCI_CSV_URL, target_csv)
    return target_csv


def load_and_clean(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    df.columns = df.columns.str.strip()
    df[TARGET] = df[TARGET].str.strip().str.lower().map(LABEL_MAP)
    assert df[TARGET].isna().sum() == 0, f"Unmapped labels in {TARGET}"
    df = df[(df["HeartRate"] >= 40) & (df["Age"] >= 10) & (df["Age"] <= 70)].reset_index(drop=True)
    return df


def get_models() -> dict:
    return {
        "rf": RandomForestClassifier(
            n_estimators=200, random_state=SEED, class_weight="balanced"
        ),
        "lr": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=1000, random_state=SEED, class_weight="balanced")),
        ]),
        "xgb": XGBClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.1,
            random_state=SEED, eval_metric="mlogloss",
        ),
        "lgbm": LGBMClassifier(
            n_estimators=200, random_state=SEED, class_weight="balanced", verbose=-1
        ),
    }


def sync_to_backend():
    """Copy Project1/src and Project1/models into backend/Project1 for Docker/Cloud Run isolation."""
    backend_p1 = os.path.join(REPO_ROOT, "backend", "Project1")
    for sub in ["src", "models"]:
        src_dir = os.path.join(PROJECT_ROOT, sub)
        dst_dir = os.path.join(backend_p1, sub)
        if os.path.exists(dst_dir):
            shutil.rmtree(dst_dir)
        shutil.copytree(src_dir, dst_dir)
    init_file = os.path.join(backend_p1, "__init__.py")
    if not os.path.exists(init_file):
        with open(init_file, "w") as f:
            f.write("")
    print(f"Synced Project1/{{src,models}} -> {backend_p1}")


def main():
    csv_path = find_or_download_dataset(DATA_DIR)
    print(f"Loading dataset: {csv_path}")
    df = load_and_clean(csv_path)
    print(f"Cleaned rows: {len(df)}")

    X = df[FEATURES].values
    y = df[TARGET].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=SEED
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    scoring = {
        "accuracy": "accuracy",
        "macro_f1": "f1_macro",
        "recall_high": make_scorer(
            lambda yt, yp: recall_score(yt, yp, labels=[2], average="macro")
        ),
    }

    models = get_models()
    cv_summary = {}

    for key, model in models.items():
        scores = cross_validate(model, X_train, y_train, cv=cv, scoring=scoring)
        cv_summary[key] = {
            "accuracy": float(np.mean(scores["test_accuracy"])),
            "macro_f1": float(np.mean(scores["test_macro_f1"])),
            "recall_high": float(np.mean(scores["test_recall_high"])),
        }
        print(f"  {key:6s} -> Acc: {cv_summary[key]['accuracy']:.4f} | "
              f"F1: {cv_summary[key]['macro_f1']:.4f} | "
              f"High-Risk Recall: {cv_summary[key]['recall_high']:.4f}")

    best_key = max(
        cv_summary,
        key=lambda k: (cv_summary[k]["recall_high"], cv_summary[k]["macro_f1"]),
    )
    print(f"\nWinner: {best_key}")

    winner = models[best_key]
    winner.fit(X_train, y_train)
    y_pred = winner.predict(X_test)

    print("\nHold-out Test Report:")
    print(classification_report(y_test, y_pred, target_names=CLASS_NAMES, digits=4))

    test_acc = accuracy_score(y_test, y_pred)
    test_f1 = f1_score(y_test, y_pred, average="macro")
    test_rec_high = recall_score(y_test, y_pred, labels=[2], average="macro")

    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = os.path.join(MODEL_DIR, "model.joblib")
    joblib.dump(winner, model_path)
    print(f"Saved model: {model_path}")

    meta = {
        "model_version": f"{best_key}-v1",
        "model_name": best_key,
        "features": FEATURES,
        "class_map": {"0": "low", "1": "mid", "2": "high"},
        "label_encoding": LABEL_MAP,
        "cv_recall_high": round(cv_summary[best_key]["recall_high"], 4),
        "cv_macro_f1": round(cv_summary[best_key]["macro_f1"], 4),
        "cv_accuracy": round(cv_summary[best_key]["accuracy"], 4),
        "test_recall_high": round(float(test_rec_high), 4),
        "test_macro_f1": round(float(test_f1), 4),
        "test_accuracy": round(float(test_acc), 4),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "trained_at": str(date.today()),
        "random_seed": SEED,
    }
    meta_path = os.path.join(MODEL_DIR, "meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"Saved metadata: {meta_path}")

    sync_to_backend()


if __name__ == "__main__":
    main()
