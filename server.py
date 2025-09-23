from flask import Flask, render_template, request

# Flask constructor takes the name of 
# current module (__name__) as argument.
app = Flask(__name__)
app.config['DEBUG'] = True


@app.route('/')
def hello_world():
    return render_template("main.html")


@app.route('/savedata', methods=['POST'])
def savedata():
    print("save hit")
    data = request.form['data']
    with open("static/data.json", "w") as f:
        f.write(data)

    return "Save success"


# main driver function
if __name__ == '__main__':

    # run() method of Flask class runs the application 
    # on the local development server.
    app.run(host="0.0.0.0", port=5001)