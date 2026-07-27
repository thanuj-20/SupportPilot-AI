import pandas as pd, sys, os

df = pd.read_csv('f:/Springboard/tickets/Ticket.csv')
sys.stdout.write("Departments: " + str(df["Department"].value_counts().to_dict()) + "\n\n")
sys.stdout.write("Tags sample: " + str(df["Tags"].dropna().head(5).tolist()) + "\n\n")

for dept in df["Department"].unique():
    subset = df[df["Department"] == dept]["Body"].dropna()
    sys.stdout.write(f"=== {dept} ({len(subset)} tickets) ===\n")
    for body in subset.head(3):
        sys.stdout.write(body[:300] + "\n---\n")
    sys.stdout.write("\n")
