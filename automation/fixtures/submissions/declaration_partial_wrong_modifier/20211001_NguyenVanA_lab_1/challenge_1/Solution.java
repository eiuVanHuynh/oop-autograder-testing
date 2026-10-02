public class Student {
    private String id;
    private String name;
    public double gpa;

    public Student(String id, String name, double gpa) {
        this.id = id;
        this.name = name;
        this.gpa = gpa;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public double getGpa() {
        return gpa;
    }

    public void setGpa(double gpa) {
        if (gpa >= 0.0 && gpa <= 4.0) {
            this.gpa = gpa;
        }
    }

    public boolean isHonor() {
        return gpa >= 3.2;
    }

    @Override
    public String toString() {
        return id + " - " + name + " (" + gpa + ")";
    }
}
