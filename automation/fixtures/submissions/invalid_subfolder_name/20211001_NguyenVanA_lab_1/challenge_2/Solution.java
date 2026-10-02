abstract class Shape {
    public abstract double area();

    public String describe() {
        return getClass().getSimpleName() + " area=" + String.format("%.2f", area());
    }
}

public class Circle extends Shape {
    private double radius;

    public Circle(double radius) {
        this.radius = radius;
    }

    @Override
    public double area() {
        return Math.PI * radius * radius;
    }
}
