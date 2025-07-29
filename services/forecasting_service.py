#!/usr/bin/env python3
"""
Demand Forecasting Service using Statistical Models
For QuickMart eCommerce Platform
"""

import sys
import json
import numpy as np
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

try:
    import pandas as pd
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "Pandas not installed. Please run: pip install pandas"
    }))
    sys.exit(1)

def preprocess_data(sales_data):
    """
    Preprocess sales data for Prophet forecasting
    Expected input: List of dictionaries with 'date' and 'quantity' keys
    """
    if not sales_data or len(sales_data) < 2:
        return None, "Insufficient data for forecasting (minimum 2 data points required)"
    
    try:
        # Convert to DataFrame
        df = pd.DataFrame(sales_data)
        
        # Ensure we have the required columns
        if 'date' not in df.columns or 'quantity' not in df.columns:
            return None, "Data must contain 'date' and 'quantity' columns"
        
        # Convert date column to datetime
        df['date'] = pd.to_datetime(df['date'])
        
        # Group by date and sum quantities (in case of multiple orders on same date)
        df_grouped = df.groupby('date')['quantity'].sum().reset_index()
        
        # Rename columns for Prophet (ds = datestamp, y = value to forecast)
        df_prophet = df_grouped.rename(columns={'date': 'ds', 'quantity': 'y'})
        
        # Sort by date
        df_prophet = df_prophet.sort_values('ds').reset_index(drop=True)
        
        # Fill missing dates with 0 sales (optional - helps with irregular data)
        date_range = pd.date_range(start=df_prophet['ds'].min(), 
                                 end=df_prophet['ds'].max(), 
                                 freq='D')
        df_complete = pd.DataFrame({'ds': date_range})
        df_prophet = df_complete.merge(df_prophet, on='ds', how='left').fillna(0)
        
        return df_prophet, None
        
    except Exception as e:
        return None, f"Data preprocessing error: {str(e)}"

def create_statistical_model(df):
    """
    Create and configure statistical forecasting model
    """
    try:
        # Simple but effective statistical model
        # Uses trend, seasonality, and moving averages
        
        if len(df) < 2:
            return None, "Insufficient data for modeling"
        
        # Calculate basic statistics
        values = df['y'].values
        dates = pd.to_datetime(df['ds'])
        
        # Calculate trend using linear regression
        x = np.arange(len(values))
        trend_coef = np.polyfit(x, values, 1)
        
        # Calculate weekly seasonality if we have enough data
        weekly_pattern = None
        if len(values) >= 7:
            # Group by day of week and calculate average
            df['day_of_week'] = dates.dt.dayofweek
            weekly_pattern = df.groupby('day_of_week')['y'].mean().values
        
        # Calculate moving averages for smoothing
        window_size = min(7, len(values) // 2)
        if window_size > 0:
            moving_avg = pd.Series(values).rolling(window=window_size, min_periods=1).mean().values
        else:
            moving_avg = values
        
        model_data = {
            'trend_coef': trend_coef,
            'weekly_pattern': weekly_pattern,
            'moving_avg': moving_avg,
            'historical_mean': np.mean(values),
            'historical_std': np.std(values),
            'last_values': values[-min(7, len(values)):],  # Last week for momentum
            'data_length': len(values)
        }
        
        return model_data, None
        
    except Exception as e:
        return None, f"Model creation error: {str(e)}"

def generate_forecast(model_data, df, forecast_days=30):
    """
    Generate forecast using statistical model
    """
    try:
        # Extract model components
        trend_coef = model_data['trend_coef']
        weekly_pattern = model_data['weekly_pattern']
        historical_mean = model_data['historical_mean']
        historical_std = model_data['historical_std']
        last_values = model_data['last_values']
        data_length = model_data['data_length']
        
        # Generate forecast dates
        last_date = pd.to_datetime(df['ds'].iloc[-1])
        forecast_dates = [last_date + timedelta(days=i+1) for i in range(forecast_days)]
        
        result = []
        
        for i, date in enumerate(forecast_dates):
            # Calculate trend component
            trend_value = trend_coef[0] * (data_length + i) + trend_coef[1]
            
            # Calculate seasonal component
            seasonal_value = 0
            if weekly_pattern is not None:
                day_of_week = date.weekday()
                seasonal_value = weekly_pattern[day_of_week] - historical_mean
            
            # Calculate momentum from recent values
            momentum = 0
            if len(last_values) > 0:
                recent_trend = np.mean(np.diff(last_values)) if len(last_values) > 1 else 0
                momentum = recent_trend * 0.5  # Dampen the momentum
            
            # Combine components
            base_prediction = max(0, trend_value + seasonal_value + momentum)
            
            # Add some randomness for confidence intervals
            uncertainty = historical_std * 0.8  # 80% of historical std
            lower_bound = max(0, base_prediction - uncertainty)
            upper_bound = base_prediction + uncertainty
            
            # Apply smoothing to avoid extreme values
            if i > 0:
                prev_prediction = result[i-1]['predicted_quantity']
                # Smooth the prediction to avoid sudden jumps
                base_prediction = 0.7 * base_prediction + 0.3 * prev_prediction
            
            result.append({
                'date': date.strftime('%Y-%m-%d'),
                'predicted_quantity': round(max(0, base_prediction), 2),
                'lower_bound': round(lower_bound, 2),
                'upper_bound': round(upper_bound, 2),
                'trend': round(trend_coef[0], 2)
            })
        
        # Calculate summary statistics
        total_predicted = sum([item['predicted_quantity'] for item in result])
        avg_daily = total_predicted / forecast_days if forecast_days > 0 else 0
        
        # Calculate growth rate
        growth_rate = ((avg_daily - historical_mean) / historical_mean * 100) if historical_mean > 0 else 0
        
        summary = {
            'total_predicted_quantity': round(total_predicted, 2),
            'average_daily_quantity': round(avg_daily, 2),
            'historical_daily_average': round(historical_mean, 2),
            'predicted_growth_rate_percent': round(growth_rate, 2),
            'forecast_period_days': forecast_days,
            'data_points_used': data_length
        }
        
        return {
            'forecast': result,
            'summary': summary
        }, None
        
    except Exception as e:
        return None, f"Forecasting error: {str(e)}"

def main():
    """
    Main function to handle command line arguments and execute forecasting
    """
    try:
        # Read input from command line arguments
        if len(sys.argv) < 2:
            print(json.dumps({
                "success": False,
                "error": "No input data provided"
            }))
            sys.exit(1)
        
        # Parse input JSON
        input_data = json.loads(sys.argv[1])
        
        # Extract parameters
        sales_data = input_data.get('sales_data', [])
        forecast_days = input_data.get('forecast_days', 30)
        product_id = input_data.get('product_id', 'unknown')
        product_name = input_data.get('product_name', 'Unknown Product')
        
        # Validate forecast_days
        if forecast_days < 1 or forecast_days > 365:
            print(json.dumps({
                "success": False,
                "error": "Forecast days must be between 1 and 365"
            }))
            sys.exit(1)
        
        # Preprocess data
        df, error = preprocess_data(sales_data)
        if error:
            print(json.dumps({
                "success": False,
                "error": error
            }))
            sys.exit(1)
        
        # Create statistical model
        model_data, error = create_statistical_model(df)
        if error:
            print(json.dumps({
                "success": False,
                "error": error
            }))
            sys.exit(1)
        
        # Generate forecast
        forecast_result, error = generate_forecast(model_data, df, forecast_days)
        if error:
            print(json.dumps({
                "success": False,
                "error": error
            }))
            sys.exit(1)
        
        # Prepare final response
        response = {
            "success": True,
            "product_id": product_id,
            "product_name": product_name,
            "forecast_generated_at": datetime.now().isoformat(),
            **forecast_result
        }
        
        print(json.dumps(response, indent=2))
        
    except json.JSONDecodeError:
        print(json.dumps({
            "success": False,
            "error": "Invalid JSON input"
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Unexpected error: {str(e)}"
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
