from flask import Flask, request, jsonify, send_file
from flask_pymongo import PyMongo
from flask_cors import CORS
import os
from dotenv import load_dotenv
from bson.objectid import ObjectId
from bson import json_util
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
import numpy as np
import bcrypt
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required, JWTManager
from functools import wraps
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment
import io

load_dotenv()

app = Flask(__name__)
CORS(app)

# Setup the Flask-JWT-Extended extension
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "super-secret")  # Change this!
jwt = JWTManager(app)

app.config["MONGO_URI"] = os.getenv("MONGO_URI")
mongo = PyMongo(app)

# Role-based decorator
def role_required(role):
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            current_user = get_jwt_identity()
            user = mongo.db.users.find_one({'username': current_user})
            if user and user.get('role') == role:
                return fn(*args, **kwargs)
            else:
                return jsonify({"error": "Admins only!"}), 403
        return decorator
    return wrapper

def create_initial_admin():
    admin_username = os.getenv("ADMIN_USERNAME")
    admin_password = os.getenv("ADMIN_PASSWORD")

    if admin_username and admin_password:
        admin_user = mongo.db.users.find_one({"username": admin_username})
        if not admin_user:
            hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt())
            mongo.db.users.insert_one({
                "username": admin_username,
                "password": hashed_password,
                "role": "admin"
            })
            print(f"Admin user '{admin_username}' created.")

# Call this function at startup
with app.app_context():
    create_initial_admin()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400

    user = mongo.db.users.find_one({'username': username})

    if user and bcrypt.checkpw(password.encode('utf-8'), user['password']):
        access_token = create_access_token(identity=username)
        return jsonify(access_token=access_token, role=user.get('role'))
    
    return jsonify({"error": "Invalid credentials"}), 401

# User Management (Admin only)
@app.route('/api/users', methods=['POST'])
@role_required('admin')
def add_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'assistant') # Default to assistant

    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400

    if mongo.db.users.find_one({'username': username}):
        return jsonify({"error": "Username already exists"}), 409

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    mongo.db.users.insert_one({
        "username": username,
        "password": hashed_password,
        "role": role
    })
    return jsonify({"message": f"User '{username}' created successfully"}), 201

@app.route('/api/users', methods=['GET'])
@role_required('admin')
def get_users():
    users = mongo.db.users.find({'role': 'assistant'})
    return json_util.dumps(users)

@app.route('/api/users/<id>', methods=['PUT'])
@role_required('admin')
def update_user(id):
    data = request.get_json()
    new_username = data.get('username')
    new_password = data.get('password')

    if not new_username and not new_password:
        return jsonify({"error": "Username or password is required"}), 400

    update_fields = {}

    if new_username:
        existing_user = mongo.db.users.find_one({"username": new_username})
        if existing_user and str(existing_user['_id']) != id:
            return jsonify({"error": "Username already exists"}), 409
        update_fields['username'] = new_username

    if new_password:
        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        update_fields['password'] = hashed_password
    
    mongo.db.users.update_one(
        {'_id': ObjectId(id)},
        {'$set': update_fields}
    )
    return jsonify({"message": "User updated successfully"})

@app.route('/api/users/<id>', methods=['DELETE'])
@role_required('admin')
def delete_user(id):
    mongo.db.users.delete_one({'_id': ObjectId(id)})
    return jsonify({"message": "User deleted successfully"})

@app.route('/api/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    current_user_username = get_jwt_identity()
    data = request.get_json()
    new_password = data.get('password')

    if not new_password:
        return jsonify({"error": "New password is required"}), 400

    hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())

    result = mongo.db.users.update_one(
        {'username': current_user_username},
        {'$set': {'password': hashed_password}}
    )

    if result.matched_count == 0:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"message": "Profile updated successfully"})

# Responsable Management
@app.route('/api/responsables', methods=['GET'])
@jwt_required()
def get_responsables():
    responsables = mongo.db.responsables.find()
    return json_util.dumps(responsables)

@app.route('/api/responsables', methods=['POST'])
@role_required('admin')
def add_responsable():
    data = request.get_json()
    nom = data.get('nom')
    prenom = data.get('prenom')

    if not nom or not prenom:
        return jsonify({"error": "Missing 'nom' or 'prenom'"}), 400

    mongo.db.responsables.insert_one({
        "nom": nom,
        "prenom": prenom
    })
    return jsonify({"message": "Responsable added successfully"}), 201

@app.route('/api/responsables/<id>', methods=['PUT'])
@role_required('admin')
def update_responsable(id):
    data = request.get_json()
    nom = data.get('nom')
    prenom = data.get('prenom')

    if not nom or not prenom:
        return jsonify({"error": "Missing 'nom' or 'prenom'"}), 400

    mongo.db.responsables.update_one(
        {'_id': ObjectId(id)},
        {'$set': {
            "nom": nom,
            "prenom": prenom
        }}
    )
    return jsonify({"message": "Responsable updated successfully"})

@app.route('/api/responsables/<id>', methods=['DELETE'])
@role_required('admin')
def delete_responsable(id):
    mongo.db.responsables.delete_one({'_id': ObjectId(id)})
    return jsonify({"message": "Responsable deleted successfully"})


# Protected routes
@app.route('/centres', methods=['GET'])
@jwt_required()
def get_centres():
    centres = mongo.db.centres.find()
    return json_util.dumps(centres)

@app.route('/centres', methods=['POST'])
@role_required('admin')
def add_centre():
    data = request.get_json()
    nom = data.get('nom')
    responsable = data.get('responsable')

    if not nom or not responsable:
        return jsonify({"error": "Missing 'nom' or 'responsable'"}), 400

    mongo.db.centres.insert_one({
        "nom": nom,
        "responsable": responsable
    })
    return jsonify({"message": "Centre added successfully"}), 201

@app.route('/centres/<id>', methods=['PUT'])
@role_required('admin')
def update_centre(id):
    data = request.get_json()
    nom = data.get('nom')
    responsable = data.get('responsable')

    if not nom or not responsable:
        return jsonify({"error": "Missing 'nom' or 'responsable'"}), 400

    mongo.db.centres.update_one(
        {'_id': ObjectId(id)},
        {'$set': {
            "nom": nom,
            "responsable": responsable
        }}
    )
    return jsonify({"message": "Centre updated successfully"})

@app.route('/centres/<id>', methods=['DELETE'])
@role_required('admin')
def delete_centre(id):
    mongo.db.centres.delete_one({'_id': ObjectId(id)})
    return jsonify({"message": "Centre deleted successfully"})

@app.route('/centres/<id>', methods=['GET'])
@jwt_required()
def get_centre(id):
    centre = mongo.db.centres.find_one({'_id': ObjectId(id)})
    return json_util.dumps(centre)

@app.route('/depenses', methods=['GET'])
@jwt_required()
def get_depenses():
    depenses = mongo.db.depenses.find()
    return json_util.dumps(depenses)

@app.route('/depenses', methods=['POST'])
@jwt_required()
def add_depense():
    data = request.get_json()
    date = data.get('date')
    montant = float(data.get('montant'))
    description = data.get('description')
    centre_id = data.get('centre_id')
    created_by = get_jwt_identity()

    if not date or not montant or not description or not centre_id:
        return jsonify({"error": "Missing required fields"}), 400

    mongo.db.depenses.insert_one({
        "date": date,
        "montant": montant,
        "description": description,
        "centre_id": ObjectId(centre_id),
        "created_by": created_by
    })
    return jsonify({"message": "Depense added successfully"}), 201

@app.route('/depenses/<id>', methods=['PUT'])
@jwt_required()
def update_depense(id):
    depense = mongo.db.depenses.find_one({'_id': ObjectId(id)})
    if not depense:
        return jsonify({"error": "Depense not found"}), 404

    current_user_username = get_jwt_identity()
    current_user = mongo.db.users.find_one({'username': current_user_username})

    # Permission check
    if current_user['role'] != 'admin' and depense.get('created_by') != current_user_username:
        return jsonify({"error": "Permission denied: You can only edit your own expenses."}), 403

    data = request.get_json()
    date = data.get('date')
    montant = float(data.get('montant'))
    description = data.get('description')
    centre_id = data.get('centre_id')

    if not date or not montant or not description or not centre_id:
        return jsonify({"error": "Missing required fields"}), 400

    mongo.db.depenses.update_one(
        {'_id': ObjectId(id)},
        {'$set': {
            "date": date,
            "montant": montant,
            "description": description,
            "centre_id": ObjectId(centre_id)
        }}
    )
    return jsonify({"message": "Depense updated successfully"})

@app.route('/depenses/<id>', methods=['DELETE'])
@jwt_required()
def delete_depense(id):
    depense = mongo.db.depenses.find_one({'_id': ObjectId(id)})
    if not depense:
        return jsonify({"error": "Depense not found"}), 404
        
    current_user_username = get_jwt_identity()
    current_user = mongo.db.users.find_one({'username': current_user_username})

    # Permission check
    if current_user['role'] != 'admin' and depense.get('created_by') != current_user_username:
        return jsonify({"error": "Permission denied: You can only delete your own expenses."}), 403

    mongo.db.depenses.delete_one({'_id': ObjectId(id)})
    return jsonify({"message": "Depense deleted successfully"})

@app.route('/depenses/<id>', methods=['GET'])
@jwt_required()
def get_depense(id):
    depense = mongo.db.depenses.find_one({'_id': ObjectId(id)})
    return json_util.dumps(depense)


# Budget Management
@app.route('/api/budgets', methods=['GET'])
@jwt_required()
def get_budgets():
    budgets = mongo.db.budgets.find()
    return json_util.dumps(budgets)

@app.route('/api/budgets', methods=['POST'])
@role_required('admin')
def add_budget():
    data = request.get_json()
    centre_id = data.get('centre_id')
    trimester = data.get('trimester')
    annee = data.get('annee')
    montant = data.get('montant')

    if not centre_id or not trimester or not annee or not montant:
        return jsonify({"error": "Missing 'centre_id', 'trimester', 'annee', or 'montant'"}), 400

    mongo.db.budgets.insert_one({
        "centre_id": ObjectId(centre_id),
        "trimester": int(trimester),
        "annee": int(annee),
        "montant": float(montant)
    })
    return jsonify({"message": "Budget added successfully"}), 201

@app.route('/api/budgets/<id>', methods=['PUT'])
@role_required('admin')
def update_budget(id):
    data = request.get_json()
    centre_id = data.get('centre_id')
    trimester = data.get('trimester')
    annee = data.get('annee')
    montant = data.get('montant')

    if not centre_id or not trimester or not annee or not montant:
        return jsonify({"error": "Missing 'centre_id', 'trimester', 'annee', or 'montant'"}), 400

    mongo.db.budgets.update_one(
        {'_id': ObjectId(id)},
        {'$set': {
            "centre_id": ObjectId(centre_id),
            "trimester": int(trimester),
            "annee": int(annee),
            "montant": float(montant)
        }}
    )
    return jsonify({"message": "Budget updated successfully"})

@app.route('/api/budgets/<id>', methods=['DELETE'])
@role_required('admin')
def delete_budget(id):
    mongo.db.budgets.delete_one({'_id': ObjectId(id)})
    return jsonify({"message": "Budget deleted successfully"})

@app.route('/api/predictions', methods=['GET'])
@jwt_required()
def get_prediction():
    centre_id = request.args.get('centre_id')
    trimester_str = request.args.get('trimester')
    annee_str = request.args.get('annee')

    if not centre_id or not trimester_str or not annee_str:
        return jsonify({"error": "Missing 'centre_id', 'trimester', or 'annee'"}), 400

    try:
        target_trimester = int(trimester_str)
        target_annee = int(annee_str)
    except ValueError:
        return jsonify({"error": "Invalid trimester or annee format"}), 400

    # Get historical data for the center
    depenses = mongo.db.depenses.find({"centre_id": ObjectId(centre_id)})
    df = pd.DataFrame(list(depenses))

    if df.empty:
        return jsonify({"prediction": 0, "r2_score": 0, "message": "No historical data for prediction"})

    df['date'] = pd.to_datetime(df['date'])
    df['annee'] = df['date'].dt.year
    df['trimester'] = (df['date'].dt.month - 1) // 3 + 1 # Calculate trimester (1-4)
    df['montant'] = df['montant'].astype(float)

    # Aggregate historical expenses by trimester and year
    aggregated_df = df.groupby(['annee', 'trimester'])['montant'].sum().reset_index()
    aggregated_df.rename(columns={'montant': 'total_montant'}, inplace=True)

    if len(aggregated_df) < 2:
        return jsonify({"prediction": 0, "r2_score": 0, "message": "Not enough aggregated data (less than 2 trimesters) for meaningful prediction"})
    
    # Prepare training data
    # X will be a single feature representing time (e.g., year + trimester as a decimal)
    aggregated_df['time_feature'] = aggregated_df['annee'] + (aggregated_df['trimester'] / 4.0)
    
    X_train = aggregated_df[['time_feature']]
    y_train = aggregated_df['total_montant']

    model = LinearRegression()
    model.fit(X_train, y_train)

    # Prepare data for prediction
    target_time_feature = target_annee + (target_trimester / 4.0)
    
    # Predict total expenses for the target trimester
    total_prediction = model.predict([[target_time_feature]])[0]
    
    # Calculate R2 score for the aggregated model
    y_pred_train = model.predict(X_train)
    r2 = r2_score(y_train, y_pred_train)
    
    return jsonify({"prediction": total_prediction, "r2_score": r2})


@app.route('/api/export/budgets', methods=['GET'])
@jwt_required()
def export_budgets():
    # Fetch all data
    budgets_raw = list(mongo.db.budgets.find())
    centres_raw = list(mongo.db.centres.find())
    depenses_raw = list(mongo.db.depenses.find())

    # Convert ObjectIds to strings and prepare for DataFrame
    for b in budgets_raw:
        b['_id'] = str(b['_id'])
        b['centre_id'] = str(b['centre_id'])
    for c in centres_raw:
        c['_id'] = str(c['_id'])
    for d in depenses_raw:
        d['_id'] = str(d['_id'])
        d['centre_id'] = str(d['centre_id'])
        d['date'] = pd.to_datetime(d['date']) # Ensure date is datetime object

    budgets_df = pd.DataFrame(budgets_raw)
    centres_df = pd.DataFrame(centres_raw)
    depenses_df = pd.DataFrame(depenses_raw)

    # --- Sheet 1: Analyse des écarts ---
    analyse_ecarts_data = []
    centre_name_map = {str(c['_id']): c['nom'] for c in centres_raw}

    for idx, budget in budgets_df.iterrows():
        centre_name = centre_name_map.get(budget['centre_id'], 'N/A')
        
        # Calculate Réel
        filtered_depenses = depenses_df[
            (depenses_df['centre_id'] == budget['centre_id']) &
            (depenses_df['date'].dt.year == budget['annee']) &
            (((depenses_df['date'].dt.month - 1) // 3 + 1) == budget['trimester'])
        ]
        reel_value = filtered_depenses['montant'].sum()

        montant_budget = float(budget['montant'])
        ecart = reel_value - montant_budget
        taux_ecart = (ecart / montant_budget) * 100 if montant_budget != 0 else 0

        interpretation = ''
        if taux_ecart > 0:
            interpretation = 'surcoût'
        elif taux_ecart < 0:
            interpretation = 'économie'
        else:
            interpretation = 'neutre'

        analyse_ecarts_data.append({
            'Centre': centre_name,
            'Trimestre': budget['trimester'],
            'Année': budget['annee'],
            'Montant Budget': montant_budget,
            'Réel': reel_value,
            'Écart': ecart,
            "Taux d'écart": taux_ecart,
            'Interprétation': interpretation
        })
    
    analyse_ecarts_df = pd.DataFrame(analyse_ecarts_data)

    # --- Sheet 2: Tableau des dépenses trimestriel par centre de coûts (Finance et IT) ---
    finance_it_centres_ids = [str(c['_id']) for c in centres_raw if c['nom'] in ['Finance', 'IT']]
    
    depenses_finance_it_df = depenses_df[depenses_df['centre_id'].isin(finance_it_centres_ids)].copy()
    
    depenses_summary_data = []
    if not depenses_finance_it_df.empty:
        depenses_finance_it_df['annee'] = depenses_finance_it_df['date'].dt.year
        depenses_finance_it_df['trimester'] = (depenses_finance_it_df['date'].dt.month - 1) // 3 + 1
        depenses_finance_it_df['centre_name'] = depenses_finance_it_df['centre_id'].map(centre_name_map)

        for idx, depense in depenses_finance_it_df.iterrows():
            # Find the budget for this specific centre, trimester, and year
            corresponding_budget = budgets_df[
                (budgets_df['centre_id'] == depense['centre_id']) &
                (budgets_df['trimester'] == depense['trimester']) &
                (budgets_df['annee'] == depense['annee'])
            ]

            depenses_summary_data.append({
                'Trimestre': depense['trimester'],
                'Centre': depense['centre_name'],
                'Nature de dépense': depense['description'],
                'Date dépense': depense['date'].strftime('%Y-%m-%d'),
                'Réelle (MAD)': depense['montant']
            })
    
    depenses_summary_df = pd.DataFrame(depenses_summary_data)

    # Create a new Excel workbook and add sheets
    wb = Workbook()

    # Sheet 1: Analyse des écarts
    ws1 = wb.active
    ws1.title = "Analyse des écarts"
    
    # Headers
    ws1.append(list(analyse_ecarts_df.columns))
    # Data
    for r_idx, row in analyse_ecarts_df.iterrows():
        ws1.append(list(row.values))

    # Apply formatting
    for cell in ws1["1:1"]:
        cell.font = Font(bold=True)
        cell.alignment = Alignment(horizontal='center')
    for col in ws1.columns:
        max_length = 0
        column = col[0].column_letter # Get the column name
        for cell in col:
            try: # Necessary to avoid error on empty cells
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = (max_length + 2)
        ws1.column_dimensions[column].width = adjusted_width

    # Sheet 2: Tableau des dépenses trimestriel par centre de coûts (Finance et IT)
    ws2 = wb.create_sheet(title="Dépenses Trimestrielles FI")
    
    # Headers
    ws2.append(list(depenses_summary_df.columns))
    # Data
    for r_idx, row in depenses_summary_df.iterrows():
        ws2.append(list(row.values))
    
    # Apply formatting
    for cell in ws2["1:1"]:
        cell.font = Font(bold=True)
        cell.alignment = Alignment(horizontal='center')
    for col in ws2.columns:
        max_length = 0
        column = col[0].column_letter # Get the column name
        for cell in col:
            try: # Necessary to avoid error on empty cells
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = (max_length + 2)
        ws2.column_dimensions[column].width = adjusted_width

    # Save the workbook to a BytesIO object
    excel_file = io.BytesIO()
    wb.save(excel_file)
    excel_file.seek(0) # Go to the beginning of the stream

    return send_file(
        excel_file,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        download_name='Analyse_Budgets_Depenses.xlsx',
        as_attachment=True
    )

if __name__ == "__main__":
    app.run(debug=True, port=8000)